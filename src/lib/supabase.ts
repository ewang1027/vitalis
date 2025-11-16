import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database type definitions for better TypeScript support
export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string
          name: string
          role: string
          specialty: string | null
          phone: string | null
          email: string | null
          avatar_url: string | null
          is_online: boolean
          created_at: string
          updated_at: string
        }
      }
      patients: {
        Row: {
          id: string
          name: string
          age: number
          gender: string
          condition: string | null
          severity: string
          admission_date: string
          discharge_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      rooms: {
        Row: {
          id: string
          room_number: string
          room_name: string
          room_type: string
          status: string
          floor: number | null
          position_x: number | null
          position_y: number | null
          position_z: number | null
          created_at: string
          updated_at: string
        }
      }
      equipment: {
        Row: {
          id: string
          name: string
          equipment_type: string
          current_room_id: string | null
          is_rental: boolean
          state: string
          state_label: string | null
          idle_minutes: number
          utilization_score: number
          position_x: number | null
          position_y: number | null
          position_z: number | null
          created_at: string
          updated_at: string
        }
      }
      vitals: {
        Row: {
          id: string
          patient_id: string
          room_id: string | null
          heart_rate: number | null
          blood_pressure: string | null
          temperature: number | null
          oxygen_saturation: number | null
          respiratory_rate: number | null
          recorded_at: string
          recorded_by_id: string | null
          created_at: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          reason: string | null
          priority: string
          action: string
          status: string
          equipment_id: string | null
          room_id: string | null
          assigned_to_id: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          priority: string
          status: string
          action_label: string | null
          action_id: string | null
          related_room_id: string | null
          related_equipment_id: string | null
          created_at: string
          updated_at: string
        }
      }
      alerts: {
        Row: {
          id: string
          room_id: string
          alert_type: string
          message: string
          is_active: boolean
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string | null
          room_id: string | null
          role: string
          content: string
          created_at: string
          is_archived: boolean
          archived_at: string | null
        }
      }
      room_assignments: {
        Row: {
          id: string
          room_id: string
          patient_id: string
          assigned_doctor_id: string | null
          assigned_nurse_id: string | null
          assigned_at: string
          discharged_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
