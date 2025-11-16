import {
  getRoomContext,
  getPatientContext,
  getEquipmentContext,
  getHospitalContext,
  extractRoomNumber,
  findAvailableRoom,
} from './contextGatherer';
import {
  checkInPatient,
  dischargePatient,
  transferPatient,
  createTask,
  updateVitals,
  assignStaff,
  createAlert,
  getAvailableStaff,
} from './agentTools';

/**
 * Agent Orchestrator
 * Main multimodal agentic workflow using OpenRouter
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model options with fallbacks
// Using Haiku as primary - it's faster, more stable, and less prone to 500 errors
const MODELS = {
  primary: 'anthropic/claude-3-haiku',
  fallback: 'anthropic/claude-3.5-sonnet',
  backup: 'anthropic/claude-3-sonnet',
};

// Validate API key on module load
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY is not set! Please add it to your .env file.');
}

/**
 * Retry fetch with exponential backoff for server errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  // Log the request for debugging
  console.group('🔍 [DEBUG] OpenRouter Request Details');
  try {
    const body = JSON.parse(options.body as string);
    console.log('📤 [REQUEST] URL:', url);
    console.log('📤 [REQUEST] Model:', body.model);
    console.log('📤 [REQUEST] Message count:', body.messages?.length || 0);
    console.log('📤 [REQUEST] Tools count:', body.tools?.length || 0);
    console.log('📤 [REQUEST] Headers:', {
      hasAuth: !!(options.headers as any)?.['Authorization'],
      hasReferer: !!(options.headers as any)?.['HTTP-Referer'],
      hasTitle: !!(options.headers as any)?.['X-Title'],
    });
    
    // Calculate approximate request size
    const requestSize = new Blob([options.body as string]).size;
    console.log('📤 [REQUEST] Payload size:', `${(requestSize / 1024).toFixed(2)} KB`);
    
    // Log last few messages for context
    if (body.messages?.length > 0) {
      console.log('📤 [REQUEST] Last user message:', 
        body.messages[body.messages.length - 1]?.content?.substring(0, 100) + '...'
      );
    }
  } catch (e) {
    console.error('Failed to parse request body for logging:', e);
  }
  console.groupEnd();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [FETCH_RETRY] Attempt ${attempt + 1}/${maxRetries + 1}`);

      const response = await fetch(url, options);

      console.log(`📡 [FETCH_RETRY] Response: ${response.status} ${response.statusText}`);

      // If successful, return immediately
      if (response.ok) {
        console.log('✅ [FETCH_RETRY] Request successful');
        return response;
      }

      // For client errors (4xx), don't retry - return for error handling
      if (response.status >= 400 && response.status < 500) {
        console.warn(`⚠️ [FETCH_RETRY] Client error ${response.status}, not retrying`);
        
        // Log detailed error information
        try {
          const errorText = await response.clone().text();
          console.error('❌ [ERROR_DETAILS] Response body:', errorText);
          const errorJson = JSON.parse(errorText);
          console.error('❌ [ERROR_DETAILS] Parsed error:', errorJson);
        } catch (e) {
          console.error('Failed to parse error response');
        }
        
        return response;
      }

      // For server errors (5xx), retry
      if (response.status >= 500) {
        // Clone response before reading to avoid consuming body
        let errorText = '';
        let errorDetails = {};
        
        try {
          errorText = await response.clone().text();
          console.error(`❌ [500_ERROR] Raw response:`, errorText);
          
          // Try to parse as JSON for more details
          try {
            errorDetails = JSON.parse(errorText);
            console.error(`❌ [500_ERROR] Parsed error:`, errorDetails);
          } catch (jsonError) {
            console.error(`❌ [500_ERROR] Response is not JSON`);
          }
        } catch (textError) {
          console.error(`❌ [500_ERROR] Could not read response text:`, textError);
        }
        
        lastError = new Error(
          `OpenRouter API error (${response.status}): ${response.statusText}. ${errorText.substring(0, 500)}`
        );

        console.error(`❌ [FETCH_RETRY] Server error:`, lastError.message);

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          console.error('❌ [FETCH_RETRY] Max retries reached, throwing error');
          console.error('❌ [FETCH_RETRY] This is a server-side error from OpenRouter');
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `⏳ [FETCH_RETRY] Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      console.error(`❌ [FETCH_RETRY] Caught error:`, error);
      console.error(`❌ [FETCH_RETRY] Error type:`, error?.constructor?.name);
      console.error(`❌ [FETCH_RETRY] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack?.substring(0, 300) : 'No stack',
      });

      // Network errors or fetch failures
      if (attempt === maxRetries) {
        console.error('❌ [FETCH_RETRY] Max retries reached, throwing error');
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `⏳ [FETCH_RETRY] Network error, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Validate and sanitize message content to prevent 500 errors
 */
function sanitizeMessage(message: AgentMessage): AgentMessage {
  // Ensure content is a string and not too long
  let content = message.content;
  
  if (typeof content !== 'string') {
    content = String(content);
  }
  
  // Truncate extremely long messages (keep under 100K chars)
  if (content.length > 100000) {
    console.warn(`⚠️ [SANITIZE] Message content truncated from ${content.length} to 100000 chars`);
    content = content.substring(0, 100000) + '\n[... message truncated due to length ...]';
  }
  
  // Remove null bytes and other problematic characters
  content = content.replace(/\0/g, '');
  
  return {
    ...message,
    content,
  };
}

/**
 * Validate messages array before sending to API
 */
function validateMessages(messages: AgentMessage[]): boolean {
  if (!Array.isArray(messages) || messages.length === 0) {
    console.error('❌ [VALIDATE] Messages must be a non-empty array');
    return false;
  }
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (!msg.role || !['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
      console.error(`❌ [VALIDATE] Invalid role at index ${i}: ${msg.role}`);
      return false;
    }
    
    if (msg.content === null || msg.content === undefined) {
      console.warn(`⚠️ [VALIDATE] Empty content at index ${i}, setting to empty string`);
      msg.content = '';
    }
    
    if (typeof msg.content !== 'string') {
      console.warn(`⚠️ [VALIDATE] Non-string content at index ${i}, converting to string`);
      msg.content = String(msg.content);
    }
  }
  
  return true;
}

/**
 * Safe JSON stringification that handles circular references and errors
 */
function safeStringify(obj: any, maxDepth = 10): string {
  const seen = new WeakSet();

  const replacer = (key: string, value: any, depth = 0): any => {
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    // Handle circular references
    if (typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    // Handle special types
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    return value;
  };

  try {
    return JSON.stringify(obj, (key, value) => replacer(key, value));
  } catch (error) {
    console.error('Failed to stringify object:', error);
    return JSON.stringify({
      error: 'Serialization failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface AgentResponse {
  message: string;
  toolResults?: any[];
  visualizationData?: any;
  requiresVisualization: boolean;
  conversationHistory: AgentMessage[];
}

export interface StreamUpdate {
  type: 'progress' | 'tool_call' | 'tool_result' | 'message' | 'complete';
  content: string;
  data?: any;
}

// Tool definitions - SIMPLIFIED to reduce payload size
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_room_context',
      description: 'Get room info (patient, equipment, vitals)',
      parameters: {
        type: 'object',
        properties: {
          room_identifier: {
            type: 'string',
            description: 'Room ID or number',
          },
        },
        required: ['room_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_context',
      description: 'Get patient info',
      parameters: {
        type: 'object',
        properties: {
          patient_identifier: {
            type: 'string',
            description: 'Patient ID or name',
          },
        },
        required: ['patient_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_hospital_context',
      description: 'Get hospital overview',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_in_patient',
      description: 'Admit new patient. Extract info from conversation history.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Full name',
          },
          age: {
            type: 'number',
            description: 'Age',
          },
          gender: {
            type: 'string',
            description: 'Gender',
          },
          condition: {
            type: 'string',
            description: 'Medical condition',
          },
          severity: {
            type: 'string',
            enum: ['stable', 'moderate', 'critical', 'recovering'],
          },
        },
        required: ['name', 'age', 'gender', 'condition'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'discharge_patient',
      description: 'Discharge patient',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create task (food, cleaning, transfer, etc)',
      parameters: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            enum: [
              'food_delivery',
              'patient_transfer',
              'patient_onboarding',
              'patient_discharge',
              'cleaning_request',
              'equipment_transfer',
              'linen_restocking',
              'medication_delivery',
              'maintenance_request',
            ],
          },
          targetRoomId: {
            type: 'string',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
          },
        },
        required: ['taskType', 'targetRoomId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_available_room',
      description: 'Find available room',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// Execute a tool based on its name and arguments
async function executeTool(toolName: string, toolArgs: any): Promise<any> {
  console.log(`🔧 [TOOL] Executing: ${toolName}`, toolArgs);

  try {
    switch (toolName) {
      case 'get_room_context':
        return await getRoomContext(toolArgs.room_identifier);

      case 'get_patient_context':
        return await getPatientContext(toolArgs.patient_identifier);

      case 'get_hospital_context':
        return await getHospitalContext();

      case 'check_in_patient':
        return await checkInPatient(toolArgs);

      case 'discharge_patient':
        return await dischargePatient(toolArgs);

      case 'create_task':
        return await createTask(toolArgs);

      case 'find_available_room':
        return await findAvailableRoom(toolArgs.roomType);

      // Fallback for removed tools
      case 'get_equipment_context':
        return await getEquipmentContext(toolArgs.equipment_identifier);
      case 'transfer_patient':
        return await transferPatient(toolArgs);
      case 'update_vitals':
        return await updateVitals(toolArgs);
      case 'assign_staff':
        return await assignStaff(toolArgs);
      case 'get_available_staff':
        return await getAvailableStaff(toolArgs.role);
      case 'create_alert':
        return await createAlert(toolArgs);

      default:
        console.warn(`⚠️ [TOOL] Unknown tool: ${toolName}`);
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    console.error(`❌ [TOOL] Error executing ${toolName}:`, error);
    return {
      success: false,
      message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Main agent function - processes user input with full agentic workflow
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: AgentMessage[] = [],
  onUpdate?: (update: StreamUpdate) => void
): Promise<AgentResponse> {
  // Sanitize and validate input
  console.log('🧹 [SANITIZE] Validating and sanitizing messages');
  
  // CRITICAL: Limit conversation history to prevent payload bloat
  // Keep only the last 10 messages to avoid 500 errors
  const MAX_HISTORY = 10;
  let sanitizedHistory = conversationHistory.map(sanitizeMessage);
  
  if (sanitizedHistory.length > MAX_HISTORY) {
    console.warn(`⚠️ [TRIM] Trimming conversation history from ${sanitizedHistory.length} to ${MAX_HISTORY} messages`);
    // Keep the most recent messages
    sanitizedHistory = sanitizedHistory.slice(-MAX_HISTORY);
  }
  
  // System prompt for hospital AI assistant
  const messages: AgentMessage[] = [
    {
      role: 'system',
      content: `You are Vitalis, a friendly and efficient AI assistant for hospital operations at HackNYU Hospital. Your goal is to help staff quickly and professionally.

🎯 YOUR WORKFLOW:
1. LISTEN: Understand what the user needs
2. GATHER: If you need info, ask ONE clear question
3. ACT: Call the appropriate tool immediately when you have enough info
4. CONFIRM: After tool execution, tell user what happened in a friendly way

📋 WHAT YOU CAN DO:
- Check in patients (assign them to rooms automatically)
- Discharge patients
- Create tasks (food delivery, cleaning, equipment moves, etc.)
- Get room/patient information
- Find available rooms

💡 CONVERSATION FLOW EXAMPLES:

Example 1 - Patient Check-in:
User: "Check in a new patient"
You: "I'd be happy to help! What's the patient's name, age, and condition?"
User: "Joe John, 44, male, stable"
You: [CALL check_in_patient tool]
You: "✅ I've checked in Joe John (44, Male) to Room 102. He's all set with initial vitals recorded."

Example 2 - Direct Check-in:
User: "Check in Joe John, 44, male, not feeling well"
You: [CALL check_in_patient tool immediately - you have enough info!]
You: "✅ I've admitted Joe John (44, Male) to Room 102. His condition is noted as stable and initial vitals are being monitored."

Example 3 - Task Creation:
User: "Send food to room 102"
You: [CALL create_task tool immediately]
You: "✅ Food delivery task created for Room 102. The staff will be notified."

🔑 CRITICAL RULES:
1. Check conversation history - if you already asked for info and user responded, USE TOOLS NOW
2. When calling check_in_patient, the tool will automatically find an available room - you don't need to specify one
3. After ANY tool executes, explain what happened in a clear, professional but friendly way
4. Default missing info: severity="stable", gender to capitalized (Male/Female/Other)
5. Be concise - staff are busy. 1-2 sentences maximum after actions.
6. NEVER say "Done." alone - always explain what was done

Available tools: check_in_patient, discharge_patient, create_task, get_room_context, get_patient_context, get_hospital_context, find_available_room

Today: ${new Date().toLocaleDateString()}`,
    },
    ...sanitizedHistory,
    sanitizeMessage({
      role: 'user',
      content: userMessage,
    }),
  ];

  // Validate messages before proceeding
  if (!validateMessages(messages)) {
    throw new Error('Invalid message format detected. Please try again.');
  }

  console.log('✅ [SANITIZE] Messages validated successfully');

  let requiresVisualization = false;
  let visualizationData: any = null;
  const toolResults: any[] = [];
  let assistantMessage = '';

  // Validate API key before making request
  if (!OPENROUTER_API_KEY) {
    const errorMsg = 'OpenRouter API key is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log('🚀 [AGENT] Starting agent request');
    console.log('📝 [AGENT] Message:', userMessage);
    console.log('📚 [AGENT] Conversation history length:', conversationHistory.length);
    console.log('🔑 [AGENT] API key present:', OPENROUTER_API_KEY ? 'Yes' : 'No');
    console.log('🔑 [AGENT] API key starts with:', OPENROUTER_API_KEY?.substring(0, 15) + '...');

    onUpdate?.({
      type: 'progress',
      content: 'Processing your request...',
    });

    // Try models in order: primary -> fallback -> backup
    const modelsTried: string[] = [];
    let response: Response | null = null;
    let lastError: Error | null = null;
    let successfulModel: string = MODELS.primary; // Track which model succeeded

    for (const [modelType, modelName] of Object.entries(MODELS)) {
      try {
        console.log(`🎯 [AGENT] Trying model: ${modelName} (${modelType})`);
        modelsTried.push(modelName);

        // ALWAYS include tools - they're essential for functionality
        const requestBody: any = {
          model: modelName,
          messages,
          max_tokens: 500, // Keep moderate to prevent payload issues
          temperature: 0.7,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
        };
        
        console.log('📦 [AGENT] Including tools in request');


        console.log('📤 [AGENT] Request body:', {
          model: requestBody.model,
          messageCount: requestBody.messages.length,
          toolCount: requestBody.tools?.length || 0,
          hasTools: !!requestBody.tools,
        });

        // Validate request size (OpenRouter has limits)
        const requestBodyStr = JSON.stringify(requestBody);
        const requestSizeKB = new Blob([requestBodyStr]).size / 1024;
        console.log(`📊 [AGENT] Request payload size: ${requestSizeKB.toFixed(2)} KB`);
        
        // Warn if payload is large
        if (requestSizeKB > 200) {
          console.warn(`⚠️ [AGENT] Large request: ${requestSizeKB.toFixed(2)} KB`);
          if (requestSizeKB > 500) {
            console.error(`🔴 [AGENT] Extremely large request! This will likely cause 500 errors.`);
            console.error(`💡 [FIX] Conversation history has been trimmed. If still failing, try:`);
            console.error(`   1. Refresh the page to clear chat history`);
            console.error(`   2. Use shorter, more concise messages`);
          }
        }

        response = await fetchWithRetry(
          OPENROUTER_API_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Hospital Management System',
            },
            body: requestBodyStr,
          },
          2, // Reduced retries per model
          1000
        );

        console.log('📥 [AGENT] Response status:', response.status, response.statusText);

        // If successful, break out of loop
        if (response.ok) {
          console.log(`✅ [AGENT] Success with model: ${modelName}`);
          successfulModel = modelName; // Store the successful model
          break;
        }

        // If 4xx error, don't try other models
        if (response.status >= 400 && response.status < 500) {
          console.warn(`⚠️ [AGENT] Client error ${response.status}, not trying other models`);
          break;
        }

        // If 5xx and we had tools, try again WITHOUT tools
        if (response.status >= 500 && requestBody.tools) {
          const errorText = await response.clone().text();
          console.warn(`❌ [AGENT] 500 error with tools, retrying WITHOUT tools...`);
          
          try {
            // Retry same model but without tools
            const simpleBody = {
              model: modelName,
              messages,
              max_tokens: 500,
              temperature: 0.7,
            };
            
            const simpleResponse = await fetchWithRetry(
              OPENROUTER_API_URL,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  'HTTP-Referer': window.location.origin,
                  'X-Title': 'Hospital Management System',
                },
                body: JSON.stringify(simpleBody),
              },
              1,
              500
            );
            
            if (simpleResponse.ok) {
              console.log(`✅ [AGENT] SUCCESS without tools!`);
              response = simpleResponse;
              successfulModel = modelName; // Store the successful model
              break;
            }
          } catch (retryError) {
            console.error('Retry without tools also failed:', retryError);
          }
        }

        // If 5xx and not the last model, try next model
        if (response.status >= 500 && modelType !== 'backup') {
          const errorText = await response.clone().text();
          console.warn(`❌ [AGENT] Model ${modelName} failed with 500, trying next model...`);
          lastError = new Error(`All models failed. Last error: ${errorText}`);
          continue;
        }

        // Last model failed, break
        break;
      } catch (error) {
        console.error(`❌ [AGENT] Error with model ${modelName}:`, error);
        lastError = error as Error;

        // If not the last model, try next
        if (modelType !== 'backup') {
          console.log('🔄 [AGENT] Trying next model...');
          continue;
        }

        // Last model failed
        throw error;
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to get response from any model');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AGENT] Error response:', errorText);
      throw new Error(`OpenRouter API error (${response.status}): ${response.statusText}. ${errorText}`);
    }

    let data: any;
    try {
      data = await response.json();
      console.log('✅ [AGENT] Response parsed successfully');
    } catch (jsonError) {
      console.error('❌ [AGENT] Failed to parse API response as JSON:', jsonError);
      const responseText = await response.text();
      console.error('Raw response:', responseText);
      throw new Error(`Invalid JSON response from API: ${jsonError instanceof Error ? jsonError.message : 'JSON parse error'}`);
    }

    // Log response structure for debugging
    console.log('📊 [AGENT] Response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasFirstChoice: !!data.choices?.[0],
      hasMessage: !!data.choices?.[0]?.message,
    });

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ [AGENT] Invalid response structure:', data);
      throw new Error('Invalid API response structure: missing message data');
    }

    let assistantMsg = data.choices[0].message;
    console.log('💬 [AGENT] Assistant message received:', {
      hasContent: !!assistantMsg.content,
      hasToolCalls: !!assistantMsg.tool_calls,
      toolCallsCount: assistantMsg.tool_calls?.length || 0,
      contentPreview: assistantMsg.content?.substring(0, 100),
    });
    
    // If no tool calls, just return the text response
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const textResponse = assistantMsg.content || 'Task completed.';
      console.log('📝 [AGENT] No tool calls detected in response');
      console.log('📝 [AGENT] User message was:', userMessage);
      console.log('📝 [AGENT] AI response:', textResponse);
      console.log('💡 [AGENT] If this should have triggered a tool call, check:');
      console.log('   1. Does the AI response mention it needs more info?');
      console.log('   2. Is the system prompt being followed correctly?');
      console.log('   3. Are the tool definitions clear?');
      
      messages.push({
        role: 'assistant',
        content: textResponse,
      });

      onUpdate?.({
        type: 'complete',
        content: 'Request completed',
        data: {
          toolResults: [],
          requiresVisualization: false,
          visualizationData: null,
        },
      });

      return {
        message: textResponse,
        toolResults: [],
        visualizationData: null,
        requiresVisualization: false,
        conversationHistory: messages,
      };
    }

    // Handle tool calls in a loop (agent might make multiple tool calls)
    let iterationCount = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && iterationCount < maxIterations) {
      iterationCount++;

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: assistantMsg.content || '',
        tool_calls: assistantMsg.tool_calls,
      });

      // Execute all tool calls
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;

        // Parse tool arguments with error handling
        let toolArgs: any;
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          console.error(`Failed to parse tool arguments for ${toolName}:`, parseError);
          const errorResult = {
            success: false,
            message: `Invalid tool arguments: ${parseError instanceof Error ? parseError.message : 'JSON parse error'}`,
          };

          // Add error result to messages
          messages.push({
            role: 'tool',
            content: safeStringify(errorResult),
            tool_call_id: toolCall.id,
            name: toolName,
          });

          toolResults.push({ toolName, toolArgs: null, result: errorResult });
          continue; // Skip to next tool call
        }

        onUpdate?.({
          type: 'tool_call',
          content: `Executing: ${toolName}`,
          data: { toolName, toolArgs },
        });

        // Execute the tool
        let toolResult: any;
        try {
          toolResult = await executeTool(toolName, toolArgs);
        } catch (execError) {
          console.error(`Failed to execute tool ${toolName}:`, execError);
          toolResult = {
            success: false,
            message: `Tool execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`,
          };
        }

        toolResults.push({ toolName, toolArgs, result: toolResult });

        onUpdate?.({
          type: 'tool_result',
          content: `Completed: ${toolName}`,
          data: toolResult,
        });

        // Check if visualization is needed
        if (toolResult?.visualizationNeeded) {
          requiresVisualization = true;
          visualizationData = toolResult.visualizationData;
        }

        // Add tool result to messages with safe stringification
        const toolResultString = safeStringify(toolResult);

        messages.push({
          role: 'tool',
          content: toolResultString,
          tool_call_id: toolCall.id,
          name: toolName,
        });
      }

      // Continue conversation with tool results (use same model as initial request)
      response = await fetchWithRetry(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Hospital Management System',
        },
        body: JSON.stringify({
          model: successfulModel, // Use same model as initial request
          messages,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${response.statusText}. ${errorText}`);
      }

      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse API response as JSON:', jsonError);
        throw new Error(`Invalid JSON response from API: ${jsonError instanceof Error ? jsonError.message : 'JSON parse error'}`);
      }

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure: missing message data');
      }

      assistantMsg = data.choices[0].message;
    }

    // Final assistant message
    assistantMessage = assistantMsg.content || 'Task completed successfully.';
    
    console.log('✅ [AGENT] Final message to user:', assistantMessage);

    onUpdate?.({
      type: 'message',
      content: assistantMessage,
    });

    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    onUpdate?.({
      type: 'complete',
      content: 'Request completed',
      data: {
        toolResults,
        requiresVisualization,
        visualizationData,
      },
    });

    return {
      message: assistantMessage,
      toolResults,
      visualizationData,
      requiresVisualization,
      conversationHistory: messages,
    };
  } catch (error: any) {
    // Log error details to console for debugging
    console.group('❌ [AGENT_ERROR] Error Details');
    console.error('Error caught in runAgent:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.groupEnd();

    // Notify about error
    onUpdate?.({
      type: 'complete',
      content: 'Error occurred',
    });

    // Re-throw the error so it can be properly handled by the calling code
    // This allows ChatInterface to show appropriate error messages to users
    throw error;
  }
}

/**
 * Simplified agent call without streaming
 */
export async function callAgent(
  userMessage: string,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse> {
  return await runAgent(userMessage, conversationHistory);
}
