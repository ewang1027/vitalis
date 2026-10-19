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
import { LLM_PROXY_URL, llmNotConfiguredMessage } from '@/lib/openrouter';

/**
 * Agent Orchestrator
 * Main multimodal agentic workflow using OpenRouter, called through the
 * server's /api/llm proxy so the API key stays server-side
 */

const OPENROUTER_API_URL = LLM_PROXY_URL;

// Model options with fallbacks
// Using Haiku as primary - it's faster, more stable, and less prone to 500 errors
const MODELS = {
  primary: 'anthropic/claude-3-haiku',
  fallback: 'anthropic/claude-3.5-sonnet',
  backup: 'anthropic/claude-3-sonnet',
};

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

      // The server has no OpenRouter key: retrying won't help
      if (await llmNotConfiguredMessage(response)) {
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

// Tool definitions - ULTRA-MINIMAL to reduce payload size and prevent 500 errors
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_in_patient',
      description: 'Admit patient to room',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          gender: { type: 'string' },
          condition: { type: 'string' },
          severity: { type: 'string', enum: ['stable', 'moderate', 'critical', 'recovering'] },
        },
        required: ['name', 'age', 'gender', 'condition'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'discharge_patient',
      description: 'Discharge patient by name',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Patient name' },
        },
        required: ['patientName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_room_context',
      description: 'Get room details',
      parameters: {
        type: 'object',
        properties: { room_identifier: { type: 'string' } },
        required: ['room_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create task',
      parameters: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            enum: ['food_delivery', 'cleaning_request', 'equipment_transfer'],
          },
          targetRoomId: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['taskType', 'targetRoomId'],
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
  // Keep only the last 5 messages to avoid 500 errors from OpenRouter
  const MAX_HISTORY = 5;
  let sanitizedHistory = conversationHistory.map(sanitizeMessage);
  
  if (sanitizedHistory.length > MAX_HISTORY) {
    console.warn(`⚠️ [TRIM] Trimming conversation history from ${sanitizedHistory.length} to ${MAX_HISTORY} messages`);
    // Keep the most recent messages
    sanitizedHistory = sanitizedHistory.slice(-MAX_HISTORY);
  }
  
  // System prompt for hospital AI assistant - MINIMAL to reduce payload size
  const messages: AgentMessage[] = [
    {
      role: 'system',
      content: `Vitalis AI for hospital ops. Check conversation history before asking questions.

TOOLS:
- check_in_patient(name, age, gender, condition, severity) - Automatically finds room
- discharge_patient(patientName) - Discharge by patient name
- create_task(taskType, targetRoomId, priority)
- get_room_context(room_identifier)

RULES:
1. Check-in: If user provides patient info (name, age, gender), CALL check_in_patient immediately
2. Discharge: If user says "discharge [name]", CALL discharge_patient({patientName: "name"})
3. Default: severity="stable", capitalize gender (Male/Female/Other)
4. After tool execution, briefly explain what happened

Examples:
- "Bob Bob, 22, male, critical" -> check_in_patient({name:"Bob Bob", age:22, gender:"Male", condition:"critical", severity:"critical"})
- "discharge Sarah Johnson" -> discharge_patient({patientName:"Sarah Johnson"})`,
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

  try {
    console.log('🚀 [AGENT] Starting agent request');
    console.log('📝 [AGENT] Message:', userMessage);
    console.log('📚 [AGENT] Conversation history length:', conversationHistory.length);

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
          max_tokens: 300, // Reduced to prevent 500 errors
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
            },
            body: requestBodyStr,
          },
          2, // Reduced retries per model
          1000
        );

        console.log('📥 [AGENT] Response status:', response.status, response.statusText);

        // No OpenRouter key on the server, so other models won't work either
        if (await llmNotConfiguredMessage(response)) {
          break;
        }

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

    const notConfigured = await llmNotConfiguredMessage(response);
    if (notConfigured) {
      throw new Error(notConfigured);
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
        },
        body: JSON.stringify({
          model: successfulModel, // Use same model as initial request
          messages,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
          max_tokens: 300,
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
