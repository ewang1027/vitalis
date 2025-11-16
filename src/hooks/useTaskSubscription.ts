import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { VisualTask, TaskAnimation } from '../types/visualTasks';

export interface TaskWithAnimation extends VisualTask {
  animation?: TaskAnimation;
}

export function useTaskSubscription() {
  const [activeTasks, setActiveTasks] = useState<Map<string, TaskWithAnimation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // DO NOT fetch initial tasks - only show tasks created in current session
  // This prevents old tasks from showing visual animations on page load
  useEffect(() => {
    console.log('🎨 Visual task system initialized - waiting for new tasks...');
    // Empty initial state - tasks will only appear when created via real-time subscription
  }, []);

  // Subscribe to real-time task updates
  useEffect(() => {
    console.log('🔌 Attempting to subscribe to real-time tasks...');

    const channel = supabase
      .channel('visual-tasks', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('✅ Task update received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const task = payload.new;

            // Only show pending, in-progress, or active tasks
            if (task.status === 'pending' || task.status === 'in_progress' || task.status === 'active') {
              const visualTask: TaskWithAnimation = {
                id: task.id,
                type: mapActionToTaskType(task.action),
                title: task.title,
                description: task.reason || undefined,
                sourceRoomId: undefined,
                targetRoomId: task.room_id || '',
                status: task.status,
                progress: task.status === 'in_progress' ? 50 : 0,
                priority: task.priority,
                assignedToId: task.assigned_to_id || undefined,
                createdAt: new Date(task.created_at),
                startedAt: task.status === 'in_progress' ? new Date(task.updated_at) : undefined,
                completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
                estimatedDuration: getEstimatedDuration(task.action),
              };

              setActiveTasks((prev) => {
                const updated = new Map(prev);
                updated.set(task.id, visualTask);
                return updated;
              });
            } else if (task.status === 'completed' || task.status === 'cancelled') {
              // Remove completed/cancelled tasks after animation
              setTimeout(() => {
                setActiveTasks((prev) => {
                  const updated = new Map(prev);
                  updated.delete(task.id);
                  return updated;
                });
              }, 2000); // 2 second fade out
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveTasks((prev) => {
              const updated = new Map(prev);
              updated.delete(payload.old.id);
              return updated;
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Subscription status:', status);
        if (err) {
          console.error('❌ Subscription error:', err);
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully connected to real-time tasks!');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - realtime might not be enabled on tasks table');
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Connection timed out - check Supabase project status');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Channel closed');
          setIsConnected(false);
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fallback polling mechanism when realtime is not connected
  // Only poll for NEW tasks created after this session started
  useEffect(() => {
    const sessionStartTime = new Date().toISOString();

    // If not connected after 5 seconds, start polling
    const fallbackTimer = setTimeout(() => {
      if (!isConnected) {
        console.log('✅ Starting polling mode for NEW task updates only...');
        setIsPolling(true);

        const pollInterval = setInterval(async () => {
          if (!isConnected) {
            // Only get tasks created AFTER this session started
            const { data, error } = await supabase
              .from('tasks')
              .select('*')
              .in('status', ['pending', 'in_progress', 'active'])
              .gte('created_at', sessionStartTime)
              .order('created_at', { ascending: false });

            if (data && data.length > 0) {
              const taskMap = new Map<string, TaskWithAnimation>();
              data.forEach((task) => {
                const visualTask: TaskWithAnimation = {
                  id: task.id,
                  type: mapActionToTaskType(task.action),
                  title: task.title,
                  description: task.reason || undefined,
                  sourceRoomId: undefined,
                  targetRoomId: task.room_id || '',
                  status: task.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
                  progress: task.status === 'in_progress' || task.status === 'active' ? 50 : 0,
                  priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
                  assignedToId: task.assigned_to_id || undefined,
                  createdAt: new Date(task.created_at),
                  startedAt: task.status === 'in_progress' || task.status === 'active' ? new Date(task.updated_at) : undefined,
                  completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
                  estimatedDuration: getEstimatedDuration(task.action),
                };
                taskMap.set(task.id, visualTask);
              });
              setActiveTasks(taskMap);
            }
          }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
      }
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [isConnected]);

  // Auto-increment progress for in-progress tasks
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTasks((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        updated.forEach((task, id) => {
          if (task.status === 'in_progress' && task.progress < 100) {
            const elapsedSeconds = task.startedAt
              ? (Date.now() - task.startedAt.getTime()) / 1000
              : 0;
            const newProgress = Math.min(
              100,
              (elapsedSeconds / task.estimatedDuration) * 100
            );

            if (newProgress !== task.progress) {
              updated.set(id, { ...task, progress: newProgress });
              hasChanges = true;
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const createTask = useCallback(async (task: Omit<VisualTask, 'id' | 'createdAt' | 'progress'>) => {
    console.log('Creating task with data:', {
      title: task.title,
      reason: task.description,
      priority: task.priority,
      action: task.type,
      status: task.status,
      room_id: task.targetRoomId,
      assigned_to_id: task.assignedToId,
    });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        reason: task.description || null,
        priority: task.priority,
        action: task.type,
        status: task.status,
        room_id: task.targetRoomId,
        assigned_to_id: task.assignedToId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      console.error('Error details:', error.message, error.details);
      throw error;
    }

    console.log('✅ Task created successfully:', data);
    return data;
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }, []);

  return {
    activeTasks: Array.from(activeTasks.values()),
    isConnected: isConnected || isPolling, // Show as connected if either realtime or polling is active
    createTask,
    updateTaskStatus,
  };
}

// Helper function to map database action to visual task type
function mapActionToTaskType(action: string): VisualTask['type'] {
  const mapping: Record<string, string> = {
    'deliver_food': 'food_delivery',
    'food_delivery': 'food_delivery',
    'transfer_patient': 'patient_transfer',
    'patient_transfer': 'patient_transfer',
    'onboard_patient': 'patient_onboarding',
    'patient_onboarding': 'patient_onboarding',
    'discharge_patient': 'patient_discharge',
    'patient_discharge': 'patient_discharge',
    'clean_room': 'cleaning_request',
    'cleaning_request': 'cleaning_request',
    'transfer_equipment': 'equipment_transfer',
    'equipment_transfer': 'equipment_transfer',
    'assign_staff': 'staff_assignment',
    'staff_assignment': 'staff_assignment',
    'restock_linen': 'linen_restocking',
    'linen_restocking': 'linen_restocking',
    'deliver_medication': 'medication_delivery',
    'medication_delivery': 'medication_delivery',
    'maintenance': 'maintenance_request',
    'maintenance_request': 'maintenance_request',
  };
  return mapping[action] || 'staff_assignment';
}

// Helper function to get estimated duration based on action type
function getEstimatedDuration(action: string): number {
  const durations: Record<string, number> = {
    'deliver_food': 30,
    'food_delivery': 30,
    'transfer_patient': 45,
    'patient_transfer': 45,
    'onboard_patient': 60,
    'patient_onboarding': 60,
    'discharge_patient': 45,
    'patient_discharge': 45,
    'clean_room': 20,
    'cleaning_request': 20,
    'transfer_equipment': 25,
    'equipment_transfer': 25,
    'assign_staff': 15,
    'staff_assignment': 15,
    'restock_linen': 20,
    'linen_restocking': 20,
    'deliver_medication': 15,
    'medication_delivery': 15,
    'maintenance': 40,
    'maintenance_request': 40,
  };
  return durations[action] || 30;
}
