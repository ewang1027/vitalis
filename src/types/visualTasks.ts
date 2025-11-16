// Visual task types for real-time 3D visualization

export type VisualTaskType =
  | 'food_delivery'
  | 'patient_transfer'
  | 'patient_onboarding'
  | 'patient_discharge'
  | 'cleaning_request'
  | 'equipment_transfer'
  | 'staff_assignment'
  | 'linen_restocking'
  | 'medication_delivery'
  | 'maintenance_request';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface VisualTask {
  id: string;
  type: VisualTaskType;
  title: string;
  description?: string;
  sourceRoomId?: string;
  targetRoomId: string;
  status: TaskStatus;
  progress: number; // 0-100
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedToId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number; // in seconds
}

export interface TaskAnimation {
  taskId: string;
  currentPosition: [number, number, number];
  pathProgress: number; // 0-1
  isAnimating: boolean;
}

// Task type configurations for visual appearance
export const TASK_CONFIGS: Record<VisualTaskType, {
  icon: string;
  color: string;
  defaultDuration: number; // seconds
  requiresSourceRoom: boolean;
}> = {
  food_delivery: {
    icon: '🍽️',
    color: '#f59e0b',
    defaultDuration: 30,
    requiresSourceRoom: false, // comes from kitchen (entrance)
  },
  patient_transfer: {
    icon: '🚑',
    color: '#3b82f6',
    defaultDuration: 45,
    requiresSourceRoom: true,
  },
  patient_onboarding: {
    icon: '👤',
    color: '#10b981',
    defaultDuration: 60,
    requiresSourceRoom: false, // comes from entrance
  },
  patient_discharge: {
    icon: '🚪',
    color: '#6366f1',
    defaultDuration: 45,
    requiresSourceRoom: false, // patient leaves to exit
  },
  cleaning_request: {
    icon: '🧹',
    color: '#ef4444',
    defaultDuration: 20,
    requiresSourceRoom: false, // cleaner goes to room
  },
  equipment_transfer: {
    icon: '🏥',
    color: '#8b5cf6',
    defaultDuration: 25,
    requiresSourceRoom: true,
  },
  staff_assignment: {
    icon: '👨‍⚕️',
    color: '#06b6d4',
    defaultDuration: 15,
    requiresSourceRoom: false,
  },
  linen_restocking: {
    icon: '🛏️',
    color: '#a855f7',
    defaultDuration: 20,
    requiresSourceRoom: false, // comes from storage
  },
  medication_delivery: {
    icon: '💊',
    color: '#ec4899',
    defaultDuration: 15,
    requiresSourceRoom: false, // comes from pharmacy
  },
  maintenance_request: {
    icon: '🔧',
    color: '#f97316',
    defaultDuration: 40,
    requiresSourceRoom: false, // maintenance staff goes to room
  },
};
