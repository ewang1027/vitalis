import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { VisualTaskType } from '@/types/visualTasks';

/**
 * Hook for managing agent-triggered visualizations
 * Handles creating visual tasks in the database to trigger pathfinding animations
 */

export interface VisualizationRequest {
  taskType: VisualTaskType;
  sourceRoomId?: string;
  targetRoomId?: string;
  taskId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export function useAgentVisualization() {
  const [isCreatingVisualization, setIsCreatingVisualization] = useState(false);

  /**
   * Trigger a visualization by creating a task in the database
   * This will be picked up by the real-time subscription in useTaskSubscription
   */
  const triggerVisualization = useCallback(async (request: VisualizationRequest) => {
    setIsCreatingVisualization(true);

    try {
      const {
        taskType,
        sourceRoomId,
        targetRoomId,
        taskId,
        priority = 'medium',
      } = request;

      // Get room details for title generation
      let targetRoom;
      if (targetRoomId) {
        const { data } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', targetRoomId)
          .single();
        targetRoom = data;
      }

      // Generate title
      const titleMap: Record<VisualTaskType, string> = {
        food_delivery: 'Food Delivery',
        patient_transfer: 'Patient Transfer',
        patient_onboarding: 'Patient Check-in',
        patient_discharge: 'Patient Discharge',
        cleaning_request: 'Room Cleaning',
        equipment_transfer: 'Equipment Transfer',
        staff_assignment: 'Staff Assignment',
        linen_restocking: 'Linen Restocking',
        medication_delivery: 'Medication Delivery',
        maintenance_request: 'Maintenance Request',
      };

      const title = targetRoom
        ? `${titleMap[taskType]} - Room ${targetRoom.room_number}`
        : titleMap[taskType];

      // Map task type to database action
      const actionMap: Record<string, string> = {
        food_delivery: 'deliver_food',
        patient_transfer: 'move_asset',
        patient_onboarding: 'admit_patient',
        patient_discharge: 'discharge_patient',
        cleaning_request: 'clean_asset',
        equipment_transfer: 'move_asset',
        staff_assignment: 'assign_staff',
        linen_restocking: 'restock_linen',
        medication_delivery: 'deliver_medication',
        maintenance_request: 'repair_asset',
      };

      const action = actionMap[taskType] || 'other';

      // Create or update task in database
      let task;
      if (taskId) {
        // If taskId is provided, update the existing task
        const { data, error } = await supabase
          .from('tasks')
          .update({
            status: 'active',
          })
          .eq('id', taskId)
          .select()
          .single();

        if (error) {
          console.error('Error updating task for visualization:', error);
          return null;
        }
        task = data;
      } else {
        // Create a new task for visualization
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title,
            reason: `${taskType} triggered by AI agent`,
            priority,
            action,
            status: 'active',
            room_id: targetRoomId || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating visualization task:', error);
          return null;
        }
        task = data;
      }

      console.log('Visualization triggered:', {
        taskType,
        sourceRoomId,
        targetRoomId,
        task,
      });

      return task;
    } catch (error) {
      console.error('Error triggering visualization:', error);
      return null;
    } finally {
      setIsCreatingVisualization(false);
    }
  }, []);

  /**
   * Update task progress
   */
  const updateTaskProgress = useCallback(async (taskId: string, status: 'active' | 'done' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
    }
  }, []);

  /**
   * Complete a task (marks as done)
   */
  const completeTask = useCallback(async (taskId: string) => {
    await updateTaskProgress(taskId, 'done');
  }, [updateTaskProgress]);

  /**
   * Dismiss a task (marks as dismissed)
   */
  const dismissTask = useCallback(async (taskId: string) => {
    await updateTaskProgress(taskId, 'dismissed');
  }, [updateTaskProgress]);

  return {
    triggerVisualization,
    updateTaskProgress,
    completeTask,
    dismissTask,
    isCreatingVisualization,
  };
}
