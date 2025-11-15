/**
 * Data transformation utilities to convert Supabase database types 
 * to frontend application types
 */

import type { Database } from './supabase'
import type { Task, Asset } from '@/types/wardops'

// Supabase table row types
type DbTask = Database['public']['Tables']['tasks']['Row']
type DbEquipment = Database['public']['Tables']['equipment']['Row']

/**
 * Transform Supabase task to frontend Task type
 */
export function transformTask(dbTask: DbTask): Task {
  return {
    taskId: dbTask.id,
    priority: dbTask.priority as 'high' | 'medium' | 'low',
    assetId: dbTask.equipment_id || '',
    roomId: dbTask.room_id,
    action: dbTask.action as 'return_rental' | 'move_asset' | 'clean_asset' | 'repair_asset',
    title: dbTask.title,
    reason: dbTask.reason || '',
    status: (dbTask.status === 'pending' ? 'active' : dbTask.status) as 'active' | 'done' | 'dismissed',
    createdAt: new Date(dbTask.created_at)
  }
}

/**
 * Transform Supabase equipment to frontend Asset type
 */
export function transformEquipment(dbEquipment: DbEquipment): Asset {
  return {
    id: dbEquipment.id,
    name: dbEquipment.name,
    type: dbEquipment.equipment_type as 'bed' | 'wheelchair' | 'iv_pump' | 'oxygen_tank' | 'monitor',
    roomId: dbEquipment.current_room_id,
    isRental: dbEquipment.is_rental,
    state: dbEquipment.state as 'in_use' | 'idle_ready' | 'idle_too_long' | 'missing' | 'dirty' | 'broken',
    stateLabel: dbEquipment.state_label || dbEquipment.state,
    idleMinutes: dbEquipment.idle_minutes,
    utilizationScore: dbEquipment.utilization_score,
  }
}

/**
 * Transform tasks array
 */
export function transformTasks(dbTasks: DbTask[]): Task[] {
  return dbTasks.map(transformTask)
}

/**
 * Transform equipment array
 */
export function transformEquipmentList(dbEquipment: DbEquipment[]): Asset[] {
  return dbEquipment.map(transformEquipment)
}

