// OpenRouter API integration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'HackNYU Hospital Assistant'
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
 * @returns System message with context
 */
export function createSystemPrompt(contextData?: {
  rooms?: any[];
  equipment?: any[];
  tasks?: any[];
  patients?: any[];
}): ChatMessage {
  let prompt = `You are Vitalis, an AI assistant for hospital ward operations. You help healthcare staff manage:
- Room readiness and patient assignments
- Medical equipment tracking and utilization
- Task management and prioritization
- Patient care coordination

You provide concise, actionable responses focused on improving operational efficiency and patient care.`;

  if (contextData) {
    prompt += '\n\nCurrent Hospital Context:';

    if (contextData.rooms && contextData.rooms.length > 0) {
      prompt += `\n- Rooms: ${contextData.rooms.length} rooms monitored`;
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
