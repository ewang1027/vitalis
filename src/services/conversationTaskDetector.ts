import { VisualTaskType } from '../types/visualTasks';

export interface DetectedTask {
  type: VisualTaskType;
  targetRoomId: string;
  sourceRoomId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Analyzes recent conversation to detect if a task should be created
 * Looks for patterns like:
 * - User requests action (food, clean, transfer)
 * - User provides room number
 * - User confirms details
 * - AI confirms execution
 */
export function detectTaskFromConversation(
  messages: ConversationMessage[],
  availableRooms: string[]
): DetectedTask | null {
  // Only look at last 6 messages (3 exchanges)
  const recentMessages = messages.slice(-6);

  if (recentMessages.length < 2) return null;

  // Extract all room numbers mentioned
  const conversationText = recentMessages.map(m => m.content).join(' ').toLowerCase();

  const roomMatches = conversationText.match(/\b(?:room\s*)?(\d{3}|\d{2})\b/gi);
  const roomNumbers = roomMatches?.map(match => match.match(/\d+/)?.[0]).filter(Boolean) as string[] || [];

  if (roomNumbers.length === 0) return null;

  // Match room numbers to actual room IDs
  const matchedRoomIds = roomNumbers.map((num) => {
    const matchingRoom = availableRooms.find((id) => {
      const idLower = id.toLowerCase();
      return (
        idLower.includes(num) ||
        idLower === `room-${num}` ||
        idLower === num
      );
    });
    return matchingRoom || `room-${num}`; // Fallback to room-XXX format
  });

  if (matchedRoomIds.length === 0) return null;

  // Detect task type from keywords
  let taskType: VisualTaskType | null = null;
  let confidence = 0;

  // Food delivery detection
  if (
    (conversationText.includes('food') ||
     conversationText.includes('meal') ||
     conversationText.includes('lunch') ||
     conversationText.includes('dinner') ||
     conversationText.includes('breakfast'))
  ) {
    taskType = 'food_delivery';
    confidence = 0.9;
  }
  // Cleaning detection
  else if (
    conversationText.includes('clean') ||
    conversationText.includes('sanitize') ||
    conversationText.includes('housekeeping')
  ) {
    taskType = 'cleaning_request';
    confidence = 0.9;
  }
  // Patient transfer detection
  else if (
    (conversationText.includes('transfer') || conversationText.includes('move')) &&
    conversationText.includes('patient') &&
    roomNumbers.length >= 2
  ) {
    taskType = 'patient_transfer';
    confidence = 0.85;
  }
  // Patient admission detection
  else if (
    conversationText.includes('admit') ||
    conversationText.includes('check in') ||
    conversationText.includes('new patient') ||
    conversationText.includes('onboard')
  ) {
    taskType = 'patient_onboarding';
    confidence = 0.85;
  }
  // Patient discharge detection
  else if (
    conversationText.includes('discharge') ||
    conversationText.includes('check out') ||
    conversationText.includes('checkout') ||
    conversationText.includes('release')
  ) {
    taskType = 'patient_discharge';
    confidence = 0.85;
  }
  // Equipment transfer detection
  else if (
    (conversationText.includes('equipment') || conversationText.includes('device')) &&
    (conversationText.includes('transfer') || conversationText.includes('move')) &&
    roomNumbers.length >= 2
  ) {
    taskType = 'equipment_transfer';
    confidence = 0.8;
  }

  if (!taskType) return null;

  // Check if AI has confirmed the action (high confidence indicator)
  const lastAIMessage = recentMessages
    .filter(m => m.role === 'assistant')
    .pop();

  if (lastAIMessage) {
    const confirmationKeywords = [
      'arrange',
      'schedule',
      'process',
      'execute',
      'initiate',
      'send',
      'deliver',
      'right away',
      'now',
      'will be'
    ];

    const hasConfirmation = confirmationKeywords.some(keyword =>
      lastAIMessage.content.toLowerCase().includes(keyword)
    );

    if (hasConfirmation) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
  }

  // Check if user has confirmed/provided details (not asking questions)
  const lastUserMessage = recentMessages
    .filter(m => m.role === 'user')
    .pop();

  if (lastUserMessage && !lastUserMessage.content.includes('?')) {
    confidence = Math.min(confidence + 0.05, 1.0);
  }

  // Only return if confidence is high enough
  if (confidence < 0.75) return null;

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  if (conversationText.includes('urgent') || conversationText.includes('asap') || conversationText.includes('emergency')) {
    priority = 'urgent';
  } else if (conversationText.includes('high priority') || conversationText.includes('important')) {
    priority = 'high';
  }

  return {
    type: taskType,
    targetRoomId: matchedRoomIds[0],
    sourceRoomId: taskType === 'patient_transfer' || taskType === 'equipment_transfer'
      ? matchedRoomIds[1]
      : undefined,
    priority,
    confidence
  };
}
