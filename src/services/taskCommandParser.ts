import { VisualTaskType, TASK_CONFIGS } from '../types/visualTasks';

export interface ParsedTaskCommand {
  type: VisualTaskType;
  targetRoomId: string;
  sourceRoomId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// Fallback regex-based parser for when AI is unavailable
function parseCommandWithRegex(command: string, availableRoomIds: string[]): ParsedTaskCommand | null {
  const lowerCommand = command.toLowerCase().trim();

  // Extract room numbers from command
  const roomMatches = lowerCommand.match(/room\s*(\d+)/gi);
  const roomNumbers = roomMatches?.map((match) => {
    const num = match.match(/\d+/)?.[0];
    return num;
  }).filter(Boolean) as string[] || [];

  // Match room numbers to actual room IDs
  const roomIds = roomNumbers.map((num) => {
    // Try to find matching room ID in available rooms
    // Check for various formats: room-101, 101, Room 101, etc.
    const matchingRoom = availableRoomIds.find((id) => {
      const idLower = id.toLowerCase();
      return (
        idLower.includes(num) ||
        idLower === `room-${num}` ||
        idLower === num
      );
    });
    return matchingRoom || `room-${num}`; // Fallback to room-XXX format
  }).filter(Boolean) as string[];

  // Determine task type based on keywords
  let type: VisualTaskType | null = null;
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

  // Food delivery
  if (lowerCommand.includes('food') || lowerCommand.includes('meal') || lowerCommand.includes('deliver')) {
    type = 'food_delivery';
  }
  // Patient transfer
  else if ((lowerCommand.includes('transfer') || lowerCommand.includes('move')) && lowerCommand.includes('patient')) {
    type = 'patient_transfer';
  }
  // Patient onboarding
  else if (lowerCommand.includes('onboard') || lowerCommand.includes('admit') || lowerCommand.includes('new patient') || lowerCommand.includes('check in')) {
    type = 'patient_onboarding';
  }
  // Patient discharge
  else if (lowerCommand.includes('discharge') || lowerCommand.includes('check out') || lowerCommand.includes('checkout') || lowerCommand.includes('release patient')) {
    type = 'patient_discharge';
  }
  // Cleaning
  else if (lowerCommand.includes('clean') || lowerCommand.includes('sanitize') || lowerCommand.includes('housekeeping')) {
    type = 'cleaning_request';
  }
  // Equipment transfer
  else if ((lowerCommand.includes('transfer') || lowerCommand.includes('move')) && (lowerCommand.includes('equipment') || lowerCommand.includes('device'))) {
    type = 'equipment_transfer';
  }
  // Staff assignment
  else if (lowerCommand.includes('staff') || lowerCommand.includes('nurse') || lowerCommand.includes('doctor') || lowerCommand.includes('assign')) {
    type = 'staff_assignment';
  }
  // Linen restocking
  else if (lowerCommand.includes('linen') || lowerCommand.includes('restock') || lowerCommand.includes('bedding') || lowerCommand.includes('sheets')) {
    type = 'linen_restocking';
  }
  // Medication delivery
  else if (lowerCommand.includes('medication') || lowerCommand.includes('medicine') || lowerCommand.includes('pills') || lowerCommand.includes('drugs')) {
    type = 'medication_delivery';
  }
  // Maintenance
  else if (lowerCommand.includes('maintenance') || lowerCommand.includes('repair') || lowerCommand.includes('fix')) {
    type = 'maintenance_request';
  }

  // Determine priority
  if (lowerCommand.includes('urgent') || lowerCommand.includes('emergency') || lowerCommand.includes('asap')) {
    priority = 'urgent';
  } else if (lowerCommand.includes('high priority') || lowerCommand.includes('important')) {
    priority = 'high';
  } else if (lowerCommand.includes('low priority') || lowerCommand.includes('when possible')) {
    priority = 'low';
  }

  // Validate we have a type and target room
  if (!type || roomIds.length === 0) {
    return null;
  }

  const taskConfig = TASK_CONFIGS[type];

  return {
    type,
    targetRoomId: roomIds[0],
    sourceRoomId: taskConfig.requiresSourceRoom && roomIds.length > 1 ? roomIds[1] : undefined,
    priority,
    description: command,
  };
}

// AI-powered parser using OpenRouter
async function parseCommandWithAI(command: string, availableRoomIds: string[]): Promise<ParsedTaskCommand | null> {
  if (!OPENROUTER_API_KEY) {
    console.warn('OpenRouter API key not found, falling back to regex parser');
    return parseCommandWithRegex(command, availableRoomIds);
  }

  const systemPrompt = `You are a hospital task command parser. Parse natural language commands into structured task objects.

Available task types:
- food_delivery: Deliver food/meals to a room (no source room needed)
- patient_transfer: Move a patient from one room to another (requires source and target room)
- patient_onboarding: Admit a new patient to a room (no source room needed)
- cleaning_request: Clean/sanitize a room (no source room needed)
- equipment_transfer: Move medical equipment between rooms (requires source and target room)
- staff_assignment: Assign staff to a room (no source room needed)
- linen_restocking: Restock linens/bedding in a room (no source room needed)
- medication_delivery: Deliver medication to a room (no source room needed)
- maintenance_request: Maintenance or repair work in a room (no source room needed)

Available rooms: ${availableRoomIds.join(', ')}

Priority levels: low, medium, high, urgent

Respond ONLY with a valid JSON object in this exact format:
{
  "type": "task_type_here",
  "targetRoomId": "room-XXX",
  "sourceRoomId": "room-XXX (optional, only for transfers)",
  "priority": "medium",
  "description": "brief description"
}

If the command is invalid or unclear, respond with: {"error": "explanation"}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response (AI might add extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.error) {
      console.warn('AI parsing error:', parsed.error);
      return parseCommandWithRegex(command, availableRoomIds);
    }

    // Validate the parsed result
    if (!parsed.type || !parsed.targetRoomId) {
      return parseCommandWithRegex(command, availableRoomIds);
    }

    return {
      type: parsed.type,
      targetRoomId: parsed.targetRoomId,
      sourceRoomId: parsed.sourceRoomId,
      priority: parsed.priority || 'medium',
      description: parsed.description || command,
    };
  } catch (error) {
    console.error('AI parsing failed, falling back to regex:', error);
    return parseCommandWithRegex(command, availableRoomIds);
  }
}

// Main export function
export async function parseTaskCommand(
  command: string,
  availableRoomIds: string[] = []
): Promise<ParsedTaskCommand | null> {
  // Try AI parser first, fall back to regex if needed
  return parseCommandWithAI(command, availableRoomIds);
}

// Helper to generate example commands
export function getExampleCommands(): string[] {
  return [
    'Send food to room 101',
    'Transfer patient from room 101 to room 205',
    'Admit new patient to room 103',
    'Clean room 202 - urgent',
    'Move equipment from room 301 to room 105',
    'Assign nurse to room 104',
    'Patient onboarding to room 201 - high priority',
    'Deliver meal to room 302',
  ];
}
