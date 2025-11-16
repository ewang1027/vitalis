import { VisualTask } from '../types/visualTasks';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AIVisualParams {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  glowIntensity: number; // 0-2

  // Animation
  animationSpeed: number; // 0.5-3.0 (multiplier)
  animationStyle: 'smooth' | 'bouncy' | 'urgent' | 'gentle' | 'pulsing';

  // Path (for movement tasks)
  pathCurvature: number; // 0-1 (how curved the path is)
  pathThickness: number; // 1-5

  // Particles
  particleCount: number; // 0-50
  particleStyle: 'sparkles' | 'smoke' | 'dots' | 'trail' | 'none';

  // Icon/Visual
  icon: string; // emoji or symbol
  iconSize: number; // 0.5-2.0
  rotationSpeed: number; // 0-2

  // Special effects
  hasTrail: boolean;
  hasPulse: boolean;
  hasGlow: boolean;
  urgencyLevel: number; // 0-10
}

// Cache for generated visual params to avoid redundant API calls
const visualCache = new Map<string, AIVisualParams>();

/**
 * Generate AI-powered visual parameters for a task
 */
export async function generateAIVisuals(task: VisualTask): Promise<AIVisualParams> {
  // Create cache key from task type and priority
  const cacheKey = `${task.type}-${task.priority}`;

  // Check cache first
  if (visualCache.has(cacheKey)) {
    console.log('🎨 Using cached visual params for', cacheKey);
    return visualCache.get(cacheKey)!;
  }

  if (!OPENROUTER_API_KEY) {
    console.warn('⚠️ No OpenRouter API key, using fallback visuals');
    return getFallbackVisuals(task);
  }

  try {
    const systemPrompt = `You are a visual effects designer for a hospital management 3D interface. Generate visual parameters for task animations based on the task description.

Your goal is to create visually distinct, meaningful animations that convey:
- Task urgency (urgent tasks = faster, brighter, more intense)
- Task type (medical tasks = clinical colors, food = warm colors, etc.)
- Task complexity (complex = more particles, simpler = cleaner)

Respond with ONLY valid JSON in this exact format:
{
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "glowIntensity": 0.5-2.0,
  "animationSpeed": 0.5-3.0,
  "animationStyle": "smooth|bouncy|urgent|gentle|pulsing",
  "pathCurvature": 0.0-1.0,
  "pathThickness": 1-5,
  "particleCount": 0-50,
  "particleStyle": "sparkles|smoke|dots|trail|none",
  "icon": "emoji",
  "iconSize": 0.5-2.0,
  "rotationSpeed": 0-2,
  "hasTrail": true/false,
  "hasPulse": true/false,
  "hasGlow": true/false,
  "urgencyLevel": 0-10
}`;

    const userPrompt = `Generate visual parameters for this hospital task:

Task Type: ${task.type.replace(/_/g, ' ')}
Priority: ${task.priority}
Description: ${task.description || 'Standard task'}
Estimated Duration: ${task.estimatedDuration}s

Consider:
- ${task.priority === 'urgent' ? 'This is URGENT - use fast, bright, intense visuals' : ''}
- ${task.priority === 'high' ? 'High priority - use prominent, noticeable effects' : ''}
- ${task.priority === 'medium' ? 'Medium priority - balanced, professional look' : ''}
- ${task.priority === 'low' ? 'Low priority - subtle, gentle effects' : ''}

Generate creative, appropriate visual parameters.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'HackNYU Hospital Visual Generator'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // Higher temperature for more creative visuals
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const aiParams: AIVisualParams = JSON.parse(jsonMatch[0]);

    // Validate and sanitize params
    const validatedParams = validateVisualParams(aiParams);

    // Cache the result
    visualCache.set(cacheKey, validatedParams);
    console.log('🎨 Generated AI visuals for', cacheKey, validatedParams);

    return validatedParams;
  } catch (error) {
    console.error('❌ AI visual generation failed:', error);
    return getFallbackVisuals(task);
  }
}

/**
 * Validate and sanitize AI-generated visual params
 */
function validateVisualParams(params: Partial<AIVisualParams>): AIVisualParams {
  return {
    primaryColor: isValidHexColor(params.primaryColor) ? params.primaryColor! : '#3b82f6',
    secondaryColor: isValidHexColor(params.secondaryColor) ? params.secondaryColor! : '#60a5fa',
    glowIntensity: clamp(params.glowIntensity ?? 1, 0, 2),
    animationSpeed: clamp(params.animationSpeed ?? 1, 0.5, 3),
    animationStyle: ['smooth', 'bouncy', 'urgent', 'gentle', 'pulsing'].includes(params.animationStyle ?? '')
      ? params.animationStyle!
      : 'smooth',
    pathCurvature: clamp(params.pathCurvature ?? 0.3, 0, 1),
    pathThickness: clamp(params.pathThickness ?? 3, 1, 5),
    particleCount: Math.floor(clamp(params.particleCount ?? 10, 0, 50)),
    particleStyle: ['sparkles', 'smoke', 'dots', 'trail', 'none'].includes(params.particleStyle ?? '')
      ? params.particleStyle!
      : 'sparkles',
    icon: params.icon || '✨',
    iconSize: clamp(params.iconSize ?? 1, 0.5, 2),
    rotationSpeed: clamp(params.rotationSpeed ?? 0.5, 0, 2),
    hasTrail: params.hasTrail ?? true,
    hasPulse: params.hasPulse ?? true,
    hasGlow: params.hasGlow ?? true,
    urgencyLevel: Math.floor(clamp(params.urgencyLevel ?? 5, 0, 10)),
  };
}

/**
 * Fallback visual parameters when AI is unavailable
 */
function getFallbackVisuals(task: VisualTask): AIVisualParams {
  const priorityMap = {
    urgent: { speed: 2.5, intensity: 2, urgency: 10, particles: 40 },
    high: { speed: 1.8, intensity: 1.5, urgency: 7, particles: 25 },
    medium: { speed: 1.2, intensity: 1, urgency: 5, particles: 15 },
    low: { speed: 0.8, intensity: 0.6, urgency: 2, particles: 5 },
  };

  const config = priorityMap[task.priority];

  // Color mapping for different task types
  const colorMap: Record<string, { primary: string; secondary: string }> = {
    food_delivery: { primary: '#f59e0b', secondary: '#fbbf24' },
    patient_transfer: { primary: '#3b82f6', secondary: '#60a5fa' },
    patient_onboarding: { primary: '#10b981', secondary: '#34d399' },
    cleaning_request: { primary: '#ef4444', secondary: '#f87171' },
    equipment_transfer: { primary: '#8b5cf6', secondary: '#a78bfa' },
    staff_assignment: { primary: '#06b6d4', secondary: '#22d3ee' },
    linen_restocking: { primary: '#a855f7', secondary: '#c084fc' },
    medication_delivery: { primary: '#ec4899', secondary: '#f472b6' },
    maintenance_request: { primary: '#f97316', secondary: '#fb923c' },
  };

  const colors = colorMap[task.type] || { primary: '#3b82f6', secondary: '#60a5fa' };

  return {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    glowIntensity: config.intensity,
    animationSpeed: config.speed,
    animationStyle: task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'bouncy' : 'smooth',
    pathCurvature: 0.3,
    pathThickness: 3,
    particleCount: config.particles,
    particleStyle: task.type.includes('clean') ? 'sparkles' : 'trail',
    icon: getTaskIcon(task.type),
    iconSize: 1.2,
    rotationSpeed: config.speed * 0.3,
    hasTrail: true,
    hasPulse: task.priority !== 'low',
    hasGlow: true,
    urgencyLevel: config.urgency,
  };
}

function getTaskIcon(taskType: string): string {
  const iconMap: Record<string, string> = {
    food_delivery: '🍽️',
    patient_transfer: '🚑',
    patient_onboarding: '👤',
    cleaning_request: '🧹',
    equipment_transfer: '🏥',
    staff_assignment: '👨‍⚕️',
    linen_restocking: '🛏️',
    medication_delivery: '💊',
    maintenance_request: '🔧',
  };
  return iconMap[taskType] || '✨';
}

function isValidHexColor(color?: string): boolean {
  if (!color) return false;
  return /^#[0-9A-F]{6}$/i.test(color);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clear the visual cache (useful for testing)
 */
export function clearVisualCache() {
  visualCache.clear();
  console.log('🗑️ Visual cache cleared');
}

/**
 * Pre-generate visuals for common task types (optional optimization)
 */
export async function preloadCommonVisuals() {
  const commonTasks = [
    { type: 'food_delivery' as const, priority: 'medium' as const },
    { type: 'cleaning_request' as const, priority: 'urgent' as const },
    { type: 'patient_transfer' as const, priority: 'high' as const },
  ];

  console.log('🎨 Preloading common visual effects...');

  await Promise.all(
    commonTasks.map(async ({ type, priority }) => {
      const mockTask: VisualTask = {
        id: 'preload',
        type,
        title: 'Preload',
        targetRoomId: 'room-1',
        status: 'pending',
        progress: 0,
        priority,
        createdAt: new Date(),
        estimatedDuration: 30,
      };
      await generateAIVisuals(mockTask);
    })
  );

  console.log('✅ Visual effects preloaded');
}
