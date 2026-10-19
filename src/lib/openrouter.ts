// OpenRouter API integration. Requests go through the Express server
// (server/index.ts, POST /api/llm), which adds the API key, so the key never
// reaches the browser. The body is the same one OpenRouter takes.
import { SERVER_URL } from '@/lib/server';

export const LLM_PROXY_URL = `${SERVER_URL}/api/llm`;

/**
 * If the server answered that it has no OpenRouter key, return its message.
 * Retrying or switching models can't fix that, so callers stop early.
 */
export async function llmNotConfiguredMessage(response: Response): Promise<string | null> {
  if (response.status !== 503) return null;
  try {
    const body = await response.clone().json();
    return body?.error?.code === 'llm_not_configured' ? body.error.message : null;
  } catch {
    return null;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to OpenRouter
 * @param messages - Array of chat messages
 * @param model - Model to use (default: anthropic/claude-3.5-sonnet)
 * @returns AI response message
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = 'anthropic/claude-3.5-sonnet'
): Promise<string> {
  try {
    const response = await fetch(LLM_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response generated from OpenRouter');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

/**
 * Create a system prompt for the hospital assistant
 * @param contextData - Optional context data (rooms, equipment, etc.)
 * @param currentRoomDetails - Details about the currently selected room
 * @returns System message with context
 */
export function createSystemPrompt(
  contextData?: {
    rooms?: Record<string, unknown>[];
    equipment?: Record<string, unknown>[];
    tasks?: Record<string, unknown>[];
    patients?: Record<string, unknown>[];
  },
  currentRoomDetails?: {
    room?: Record<string, unknown>;
    patient?: Record<string, unknown>;
    vitals?: Record<string, unknown>;
    equipment?: Record<string, unknown>[];
    assignment?: Record<string, unknown>;
  }
): ChatMessage {
  let prompt = `You are Vitalis, an AI assistant for hospital ward operations. You help healthcare staff manage:
- Room readiness and patient assignments
- Medical equipment tracking and utilization
- Task management and prioritization
- Patient care coordination

You provide concise, actionable responses focused on improving operational efficiency and patient care.

CRITICAL INSTRUCTION - TWO-STEP PROCESS:

STEP 1 - Initial Request (be friendly and flexible):
- For patient admissions: Ask casually: "What's the patient's name? (Include age and severity if you know them)"
- For other tasks: Execute immediately if you have room number
- Keep it conversational and simple - ONE question maximum

STEP 2 - Execute Immediately (NO FOLLOW-UPS):
- Look at conversation history - if YOU already asked for patient info, this is the user's response!
- After user's FIRST response, EXECUTE immediately
- Use whatever info they gave (even if just a name or "none")
- Fill in missing fields with smart defaults automatically
- NO second questions - NO confirmations - just do it
- Always include [EXECUTE_TASK: ...] command after you get their first response

KEY: If your last message asked "What's the patient's name?", then EXECUTE immediately with their response!

Task Execution Format (REQUIRED when you have enough info):
[EXECUTE_TASK: task_type to room-XXX]

Available task types:

0. **AI Agent Autonomy:**
   - Check CURRENT ROOM context first
   - If viewing a room with a patient, you can reference "this patient", "here", etc.
   - Gather all available context before asking questions
   - Execute multi-step workflows autonomously

1. **Patient admission** (streamlined check-in):
   When user says "check in patient" or similar:
   
   Response: "I can help with that! What's the patient's name? (If you have age and severity level, include those too - otherwise I'll use defaults)"
   
   After user responds with ANY information (even just "John" or "none"):
   - Extract what they gave you (name, age, severity)
   - IMMEDIATELY execute without asking anything else
   - Response format (CRITICAL - MUST include [EXECUTE_TASK: ...]):
     "Checking in [Name] to the first available room. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"
   
   MANDATORY EXAMPLES - COPY THIS FORMAT EXACTLY:
   - User: "John Doe, 45, critical" → "Checking in John Doe (45, critical) to first available room. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"
   - User: "Sarah" → "Checking in Sarah to first available room. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"  
   - User: "Ashley Smithson" → "Checking in Ashley Smithson to first available room. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"
   - User: "none" → "Checking in new patient. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"
   
   ⚠️ CRITICAL: The [EXECUTE_TASK: ...] command is REQUIRED in your response or the task will fail!
   NEVER respond without including [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]

2. **Food delivery** (NO name needed):
   "Send food to 102" → "Delivering food to Room 102. [EXECUTE_TASK: food_delivery to room-102]"

3. **Cleaning** (NO name needed):
   "Clean room 205" → "Scheduling cleaning for Room 205. [EXECUTE_TASK: cleaning_request to room-205]"

4. **Patient transfer** (NO name needed):
   "Transfer patient from 101 to 205" → "Initiating transfer. [EXECUTE_TASK: patient_transfer from room-101 to room-205]"

5. **Equipment transfer** (NO name needed):
   "Move equipment from 201 to 105" → "Transferring equipment. [EXECUTE_TASK: equipment_transfer from room-201 to room-105]"

6. **Patient discharge/checkout** (two-step if room not specified):
   If user provides room immediately:
   - User: "Discharge patient from room 102" → "Discharging patient from Room 102. [EXECUTE_TASK: patient_discharge from room-102]"
   - User: "Check out patient from 103" → "Discharging patient from Room 103. [EXECUTE_TASK: patient_discharge from room-103]"
   
   If user doesn't provide room (two-step process):
   - User: "Check out patient" → Ask: "Which room should the patient be discharged from?"
   - User: "room 103" or "103" → "Discharging patient from Room 103. [EXECUTE_TASK: patient_discharge from room-103]"
   
   If currently viewing a room with a patient:
   - User: "Discharge this patient" → Execute immediately with current room

7. **Linen/Medication/Maintenance** (NO name needed):
   Execute immediately with room number

CRITICAL RULES - AI AGENT MODE:
- You are an AUTONOMOUS AGENT - gather context, then act
- When user requests something (check in, discharge, move equipment):
  1. Check if you have all needed info from context
  2. If yes: Execute immediately WITH [EXECUTE_TASK: ...]
  3. If no: Ask ONE question, then execute on response WITH [EXECUTE_TASK: ...]
- Use room context when available (viewing a specific room)
- Ask MAXIMUM one question, then execute
- Keep ALL responses under 2 sentences

⚠️ MANDATORY: EVERY action response MUST include [EXECUTE_TASK: task_type to/from room-XXX]
WITHOUT this command, tasks will NOT execute and you will fail!
Example: "Checking in John. [EXECUTE_TASK: patient_onboarding to room-AVAILABLE]"`;

  // Add current room context if available
  if (currentRoomDetails && currentRoomDetails.room) {
    prompt += '\n\n📍 CURRENTLY VIEWING ROOM:';
    prompt += `\n- Room: ${currentRoomDetails.room.room_name || currentRoomDetails.room.room_number}`;
    prompt += `\n- Type: ${currentRoomDetails.room.room_type || 'General'}`;
    prompt += `\n- Status: ${currentRoomDetails.room.status || 'Unknown'}`;

    if (currentRoomDetails.patient) {
      prompt += `\n\n👤 PATIENT IN THIS ROOM:`;
      prompt += `\n- Name: ${currentRoomDetails.patient.name}`;
      prompt += `\n- Age: ${currentRoomDetails.patient.age}`;
      prompt += `\n- Gender: ${currentRoomDetails.patient.gender}`;
      prompt += `\n- Condition: ${currentRoomDetails.patient.condition || 'Not specified'}`;
      prompt += `\n- Severity: ${currentRoomDetails.patient.severity}`;
      
      const admissionDate = new Date(currentRoomDetails.patient.admission_date);
      const daysAdmitted = Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      prompt += `\n- Admitted: ${daysAdmitted} day${daysAdmitted !== 1 ? 's' : ''} ago`;

      if (currentRoomDetails.vitals) {
        prompt += `\n\n💓 LATEST VITALS:`;
        if (currentRoomDetails.vitals.heart_rate) {
          prompt += `\n- Heart Rate: ${currentRoomDetails.vitals.heart_rate} bpm`;
        }
        if (currentRoomDetails.vitals.blood_pressure) {
          prompt += `\n- Blood Pressure: ${currentRoomDetails.vitals.blood_pressure}`;
        }
        if (currentRoomDetails.vitals.temperature) {
          prompt += `\n- Temperature: ${currentRoomDetails.vitals.temperature}°F`;
        }
        if (currentRoomDetails.vitals.oxygen_saturation) {
          prompt += `\n- O2 Saturation: ${currentRoomDetails.vitals.oxygen_saturation}%`;
        }
      }
    } else {
      prompt += `\n- Patient: None (Room is empty)`;
    }

    if (currentRoomDetails.equipment && currentRoomDetails.equipment.length > 0) {
      prompt += `\n\n🏥 EQUIPMENT IN THIS ROOM:`;
      currentRoomDetails.equipment.forEach((eq: Record<string, unknown>) => {
        prompt += `\n- ${eq.name} (${eq.equipment_type}, ${eq.state})`;
      });
    } else {
      prompt += `\n- Equipment: None`;
    }

    prompt += `\n\nWhen the user asks about "this room", "here", or "current patient", refer to the information above.`;
  }

  if (contextData) {
    prompt += '\n\nGeneral Hospital Context:';

    if (contextData.rooms && contextData.rooms.length > 0) {
      const readyRooms = contextData.rooms.filter(r => r.status === 'ready' || r.status === 'available');
      const occupiedRooms = contextData.rooms.filter(r => r.status === 'occupied');
      prompt += `\n- Rooms: ${contextData.rooms.length} total (${readyRooms.length} ready, ${occupiedRooms.length} occupied)`;
      
      // Add specific room types for intelligent routing
      const roomTypes = new Set(contextData.rooms.map(r => r.room_type).filter(Boolean));
      if (roomTypes.size > 0) {
        prompt += `\n  Room types available: ${Array.from(roomTypes).join(', ')}`;
      }
    }

    if (contextData.equipment && contextData.equipment.length > 0) {
      const inUse = contextData.equipment.filter(e => e.state === 'in_use').length;
      const idle = contextData.equipment.filter(e => e.state === 'idle_ready').length;
      prompt += `\n- Equipment: ${contextData.equipment.length} total (${inUse} in use, ${idle} available)`;
    }

    if (contextData.tasks && contextData.tasks.length > 0) {
      const pending = contextData.tasks.filter(t => t.status === 'pending').length;
      prompt += `\n- Tasks: ${pending} pending tasks`;
    }

    if (contextData.patients && contextData.patients.length > 0) {
      prompt += `\n- Patients: ${contextData.patients.length} active patients`;
    }
  }

  return {
    role: 'system',
    content: prompt
  };
}
