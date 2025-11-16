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
        return response;
      }

      // For server errors (5xx), retry
      if (response.status >= 500) {
        // Clone response before reading to avoid consuming body
        const errorText = await response.clone().text();
        lastError = new Error(
          `OpenRouter API error (${response.status}): ${response.statusText}. ${errorText.substring(0, 200)}`
        );

        console.error(`❌ [FETCH_RETRY] Server error:`, lastError.message);

        // Don't retry on last attempt
        if (attempt === maxRetries) {
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

// Tool definitions for OpenRouter function calling
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_room_context',
      description: 'Get comprehensive information about a specific room including patient, equipment, vitals, tasks, and alerts. Use this whenever the user asks about a specific room.',
      parameters: {
        type: 'object',
        properties: {
          room_identifier: {
            type: 'string',
            description: 'Room ID or room number (e.g., "102", "room-uuid")',
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
      description: 'Get comprehensive information about a specific patient including their vitals, room assignment, and assigned staff.',
      parameters: {
        type: 'object',
        properties: {
          patient_identifier: {
            type: 'string',
            description: 'Patient ID or patient name',
          },
        },
        required: ['patient_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_equipment_context',
      description: 'Get information about specific equipment including its current location and assigned tasks.',
      parameters: {
        type: 'object',
        properties: {
          equipment_identifier: {
            type: 'string',
            description: 'Equipment ID or equipment name',
          },
        },
        required: ['equipment_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_hospital_context',
      description: 'Get overall hospital status including all rooms, patients, equipment, staff, active tasks, and alerts. Use this for general hospital overview questions.',
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
      description: 'Admit a new patient to the hospital. This will create a patient record, assign them to an available room, and set up initial vitals. IMPORTANT: Check the conversation history first - if the user already provided patient information (name, age, gender, condition, etc.), extract and use it directly. Only ask for missing required fields.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Patient full name',
          },
          age: {
            type: 'number',
            description: 'Patient age',
          },
          gender: {
            type: 'string',
            description: 'Patient gender (male/female/other)',
          },
          condition: {
            type: 'string',
            description: 'Medical condition or reason for admission',
          },
          severity: {
            type: 'string',
            description: 'Condition severity: stable, moderate, critical, or recovering',
            enum: ['stable', 'moderate', 'critical', 'recovering'],
          },
          roomId: {
            type: 'string',
            description: 'Specific room ID (optional, will auto-assign if not provided)',
          },
          assignedDoctorId: {
            type: 'string',
            description: 'Doctor ID to assign (optional)',
          },
          assignedNurseId: {
            type: 'string',
            description: 'Nurse ID to assign (optional)',
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
      description: 'Discharge a patient from the hospital. This will mark the patient as inactive, release their room, and deactivate their assignment.',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID to discharge',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_patient',
      description: 'Move a patient from their current room to a different room.',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID to transfer',
          },
          targetRoomId: {
            type: 'string',
            description: 'Target room ID to move the patient to',
          },
        },
        required: ['patientId', 'targetRoomId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a task such as food delivery, cleaning request, equipment transfer, linen restocking, medication delivery, or maintenance. This will automatically trigger a visualization showing the task path.',
      parameters: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            description: 'Type of task to create',
            enum: [
              'food_delivery',
              'patient_transfer',
              'patient_onboarding',
              'patient_discharge',
              'cleaning_request',
              'equipment_transfer',
              'staff_assignment',
              'linen_restocking',
              'medication_delivery',
              'maintenance_request',
            ],
          },
          targetRoomId: {
            type: 'string',
            description: 'Target room ID where the task should be performed',
          },
          sourceRoomId: {
            type: 'string',
            description: 'Source room ID (for transfers, optional)',
          },
          priority: {
            type: 'string',
            description: 'Task priority level',
            enum: ['low', 'medium', 'high', 'urgent'],
          },
          title: {
            type: 'string',
            description: 'Custom task title (optional)',
          },
          assignedToId: {
            type: 'string',
            description: 'Staff member ID to assign the task to (optional)',
          },
          equipmentId: {
            type: 'string',
            description: 'Equipment ID for equipment-related tasks (optional)',
          },
        },
        required: ['taskType', 'targetRoomId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_vitals',
      description: 'Update vital signs for a patient.',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
          },
          heartRate: {
            type: 'number',
            description: 'Heart rate (bpm)',
          },
          bloodPressure: {
            type: 'string',
            description: 'Blood pressure (e.g., "120/80")',
          },
          temperature: {
            type: 'number',
            description: 'Body temperature (Fahrenheit)',
          },
          oxygenSaturation: {
            type: 'number',
            description: 'Oxygen saturation percentage (0-100)',
          },
          respiratoryRate: {
            type: 'number',
            description: 'Respiratory rate (breaths per minute)',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_staff',
      description: 'Assign doctor or nurse to a patient.',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'Patient ID',
          },
          doctorId: {
            type: 'string',
            description: 'Doctor ID to assign (optional)',
          },
          nurseId: {
            type: 'string',
            description: 'Nurse ID to assign (optional)',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_staff',
      description: 'Get list of available staff members, optionally filtered by role.',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: 'Staff role to filter by (doctor, nurse, etc.) - optional',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_alert',
      description: 'Create an alert for a specific room.',
      parameters: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'Room ID',
          },
          alertType: {
            type: 'string',
            description: 'Type of alert (e.g., "vitals_critical", "equipment_failure")',
          },
          message: {
            type: 'string',
            description: 'Alert message',
          },
        },
        required: ['roomId', 'alertType', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_available_room',
      description: 'Find an available room for patient admission, optionally filtered by room type.',
      parameters: {
        type: 'object',
        properties: {
          roomType: {
            type: 'string',
            description: 'Room type (ICU, general, surgery, etc.) - optional',
          },
        },
      },
    },
  },
];

// Execute a tool based on its name and arguments
async function executeTool(toolName: string, toolArgs: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, toolArgs);

  switch (toolName) {
    case 'get_room_context':
      return await getRoomContext(toolArgs.room_identifier);

    case 'get_patient_context':
      return await getPatientContext(toolArgs.patient_identifier);

    case 'get_equipment_context':
      return await getEquipmentContext(toolArgs.equipment_identifier);

    case 'get_hospital_context':
      return await getHospitalContext();

    case 'check_in_patient':
      return await checkInPatient(toolArgs);

    case 'discharge_patient':
      return await dischargePatient(toolArgs);

    case 'transfer_patient':
      return await transferPatient(toolArgs);

    case 'create_task':
      return await createTask(toolArgs);

    case 'update_vitals':
      return await updateVitals(toolArgs);

    case 'assign_staff':
      return await assignStaff(toolArgs);

    case 'get_available_staff':
      return await getAvailableStaff(toolArgs.role);

    case 'create_alert':
      return await createAlert(toolArgs);

    case 'find_available_room':
      return await findAvailableRoom(toolArgs.roomType);

    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
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
  const messages: AgentMessage[] = [
    {
      role: 'system',
      content: `You are an intelligent hospital management assistant with access to comprehensive hospital data and the ability to perform actions.

Your capabilities:
1. **Context Gathering**: You can query detailed information about rooms, patients, equipment, and overall hospital status. Always gather relevant context before taking actions.

2. **Action Execution**: You can perform various actions:
   - Check in new patients (will trigger onboarding visualization)
   - Discharge patients
   - Transfer patients between rooms (will show transfer path)
   - Create tasks like food delivery, cleaning, equipment transfer, linen restocking (all trigger visualizations)
   - Update patient vitals
   - Assign staff to patients
   - Create alerts

3. **Visualization**: Many actions automatically trigger 3D pathfinding visualizations showing dotted lines between rooms. For example:
   - Bedsheet request from room 101 will show a green dotted line path
   - Patient transfers show the movement path
   - Task deliveries show the route

4. **Progressive Workflow**:
   - First, gather context using get_room_context, get_patient_context, etc.
   - Then, based on the context, take appropriate actions
   - Provide clear feedback about what you're doing

5. **Information Requests**: When you need more information to complete a task (like patient details for check-in), ask the user specific questions.

Guidelines:
- Always be proactive in gathering context
- For requests about a specific room (e.g., "room 102"), use get_room_context to get ALL related information
- Provide detailed, helpful responses based on the data you retrieve
- When performing actions, explain what you're doing and confirm success
- If visualizations are triggered, mention them to the user

**CRITICAL - Response Formatting**:
- NEVER show raw JSON data to users
- Always convert tool results and data into natural, human-readable language
- Use bullet points, tables, or structured text instead of JSON
- Format numbers, dates, and medical values clearly (e.g., "98.6°F" not "temperature: 98.6")
- If there's an error, explain it in plain English, don't show error objects

**CRITICAL - Conversation Context Awareness**:
- You have access to the FULL conversation history above
- NEVER ask a question that was already answered in the conversation
- NEVER repeat information that was already provided
- Always reference and build upon previous messages in the conversation
- If the user already provided information (name, age, condition, etc.), USE IT directly without asking again
- Review the conversation history carefully before asking for any information

Current date: ${new Date().toLocaleDateString()}`,
    },
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ];

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

    // Initial API call with retry logic
    const requestBody = {
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      tools: AGENT_TOOLS,
      tool_choice: 'auto',
    };

    console.log('📤 [AGENT] Request body:', {
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      toolCount: requestBody.tools.length,
    });

    let response = await fetchWithRetry(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Hospital Management System',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 [AGENT] Response status:', response.status, response.statusText);

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
    });

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

      // Continue conversation with tool results (with retry logic)
      response = await fetchWithRetry(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Hospital Management System',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
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
    assistantMessage = assistantMsg.content || 'Action completed successfully.';

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
    console.error('Agent error:', error);

    onUpdate?.({
      type: 'complete',
      content: `Error: ${error.message}`,
    });

    return {
      message: `I encountered an error: ${error.message}. Please try again.`,
      toolResults,
      visualizationData: null,
      requiresVisualization: false,
      conversationHistory: messages,
    };
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
