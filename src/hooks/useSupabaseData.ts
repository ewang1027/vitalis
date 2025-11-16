import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { transformTasks, transformEquipmentList } from '@/lib/dataTransformers'
import type { Task, Asset } from '@/types/wardops'

// Type aliases for cleaner code
type Staff = Database['public']['Tables']['staff']['Row']
type Patient = Database['public']['Tables']['patients']['Row']
type Room = Database['public']['Tables']['rooms']['Row']
type Vital = Database['public']['Tables']['vitals']['Row']
type Notification = Database['public']['Tables']['notifications']['Row']
type Alert = Database['public']['Tables']['alerts']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
type RoomAssignment = Database['public']['Tables']['room_assignments']['Row']

// Hook for fetching staff/users
export function useStaff() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchStaff() {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setStaff(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [])

  return { staff, loading, error }
}

// Hook for fetching current user (first online staff member as placeholder)
export function useCurrentUser() {
  const [user, setUser] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('is_online', true)
          .limit(1)

        if (error) throw error
        // Get first online staff member
        setUser(data && data.length > 0 ? data[0] : null)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching current user:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return { user, loading, error }
}

// Hook for fetching patients
export function usePatients(activeOnly = true) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchPatients() {
      try {
        let query = supabase.from('patients').select('*')

        if (activeOnly) {
          query = query.eq('is_active', true)
        }

        const { data, error } = await query.order('admission_date', { ascending: false })

        if (error) throw error
        console.log('🔄 Patients fetched:', data?.length || 0, 'patients')
        setPatients(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [activeOnly, refreshKey])

  const refetch = () => {
    console.log('🔄 Refetching patients data...')
    setRefreshKey(prev => prev + 1)
  }

  return { patients, loading, error, refetch }
}

// Hook for fetching rooms
export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchRooms() {
      try {
        console.log('🔄 [ROOMS] Fetching rooms data... (refreshKey:', refreshKey, ')');
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('room_number', { ascending: true })

        if (error) throw error
        console.log('✅ [ROOMS] Rooms fetched:', data?.length || 0, 'rooms');
        
        // Log room statuses for debugging
        const statusCounts = data?.reduce((acc, room) => {
          acc[room.status] = (acc[room.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('📊 [ROOMS] Status breakdown:', statusCounts);
        
        setRooms(data || [])
      } catch (err) {
        setError(err as Error)
        console.error('❌ [ROOMS] Error fetching rooms:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [refreshKey])

  const refetch = () => {
    console.log('🔄 Refetching rooms data...')
    setRefreshKey(prev => prev + 1)
  }

  return { rooms, loading, error, refetch }
}

// Hook for fetching equipment/assets
export function useEquipment() {
  const [equipment, setEquipment] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchEquipment() {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        // Transform database equipment to frontend Asset type
        const transformedEquipment = data ? transformEquipmentList(data) : []
        console.log('Equipment fetched and transformed:', transformedEquipment.length, 'items')
        setEquipment(transformedEquipment)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching equipment:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEquipment()
  }, [])

  return { equipment, loading, error }
}

// Hook for fetching tasks
export function useTasks(status?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchTasks() {
      try {
        let query = supabase.from('tasks').select('*')

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        // Transform database tasks to frontend Task type
        const transformedTasks = data ? transformTasks(data) : []
        setTasks(transformedTasks)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [status])

  return { tasks, loading, error, setTasks }
}

// Hook for fetching notifications
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        let query = supabase.from('notifications').select('*')

        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { data, error } = await query
          .eq('status', 'unread')
          .order('created_at', { ascending: false })

        if (error) throw error
        setNotifications(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [userId])

  return { notifications, loading, error, setNotifications }
}

// Hook for fetching chat messages
export function useChatMessages(roomId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchMessages() {
      try {
        let query = supabase.from('chat_messages').select('*')

        if (roomId) {
          // Fetch messages for specific room
          query = query.eq('room_id', roomId)
        } else {
          // Fetch general chat messages (where room_id IS NULL)
          query = query.is('room_id', null)
        }

        // Filter out archived messages to ensure patient privacy
        query = query.eq('is_archived', false)

        const { data, error } = await query.order('created_at', { ascending: true })

        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [roomId])

  return { messages, loading, error, setMessages }
}

// Hook for fetching vitals
export function useVitals(patientId?: string) {
  const [vitals, setVitals] = useState<Vital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVitals() {
      try {
        let query = supabase.from('vitals').select('*')

        if (patientId) {
          query = query.eq('patient_id', patientId)
        }

        const { data, error } = await query.order('recorded_at', { ascending: false })

        if (error) throw error
        setVitals(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchVitals()
  }, [patientId])

  return { vitals, loading, error }
}

// Hook for fetching room assignments with related data
export function useRoomAssignments() {
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const { data, error } = await supabase
          .from('room_assignments')
          .select('*')
          .eq('is_active', true)
          .order('assigned_at', { ascending: false })

        if (error) throw error
        setAssignments(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [])

  return { assignments, loading, error }
}

// Hook for fetching alerts
export function useAlerts(roomId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        let query = supabase.from('alerts').select('*')

        if (roomId) {
          query = query.eq('room_id', roomId)
        }

        const { data, error } = await query
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAlerts(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [roomId])

  return { alerts, loading, error }
}

// Hook for fetching complete room details with all related data
export function useRoomDetails(roomId: string) {
  const [roomDetails, setRoomDetails] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchRoomDetails() {
      try {
        // Fetch room data
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (roomError) throw roomError

        // Fetch active assignment for this room
        const { data: assignment, error: assignmentError } = await supabase
          .from('room_assignments')
          .select('*')
          .eq('room_id', roomId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (assignmentError) throw assignmentError

        let patient = null
        let doctor = null
        let nurse = null
        let vitals = null

        if (assignment) {
          // Fetch patient
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', assignment.patient_id)
            .single()

          if (patientError) throw patientError
          patient = patientData

          // Fetch doctor
          if (assignment.assigned_doctor_id) {
            const { data: doctorData, error: doctorError } = await supabase
              .from('staff')
              .select('*')
              .eq('id', assignment.assigned_doctor_id)
              .single()

            if (!doctorError) doctor = doctorData
          }

          // Fetch nurse
          if (assignment.assigned_nurse_id) {
            const { data: nurseData, error: nurseError } = await supabase
              .from('staff')
              .select('*')
              .eq('id', assignment.assigned_nurse_id)
              .single()

            if (!nurseError) nurse = nurseData
          }

          // Fetch latest vitals
          const { data: vitalsData, error: vitalsError } = await supabase
            .from('vitals')
            .select('*')
            .eq('patient_id', assignment.patient_id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!vitalsError) vitals = vitalsData
        }

        // Fetch equipment in this room
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('*')
          .eq('current_room_id', roomId)

        if (equipmentError) throw equipmentError

        // Fetch active alerts for this room
        const { data: alerts, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .eq('room_id', roomId)
          .eq('is_active', true)

        if (alertsError) throw alertsError

        setRoomDetails({
          room,
          patient,
          doctor,
          nurse,
          vitals,
          equipment: equipment || [],
          alerts: alerts || []
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (roomId) {
      fetchRoomDetails()
    }
  }, [roomId])

  return { roomDetails, loading, error }
}

// Extended patient data for dashboard with room, doctor, and latest vitals
export interface PatientDashboardData {
  patient: Patient
  roomNumber: string | null
  doctorName: string | null
  latestVitals: Vital | null
  lastCheckedIn: string | null // Most recent vitals timestamp
}

// Hook for fetching all active patients with their dashboard data
export function usePatientsDashboard() {
  const [patientsData, setPatientsData] = useState<PatientDashboardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPatientsDashboard = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch all active patients
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .order('admission_date', { ascending: false })

      if (patientsError) throw patientsError

      if (!patients || patients.length === 0) {
        setPatientsData([])
        setLoading(false)
        return
      }

      // Fetch all active room assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('room_assignments')
        .select('*')
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      // Create a map of patient_id to assignment
      const assignmentMap = new Map(
        assignments?.map(a => [a.patient_id, a]) || []
      )

      // Fetch all rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')

      if (roomsError) throw roomsError

      const roomMap = new Map(rooms?.map(r => [r.id, r]) || [])

      // Fetch all staff (for doctor names)
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')

      if (staffError) throw staffError

      const staffMap = new Map(staff?.map(s => [s.id, s]) || [])

      // Fetch latest vitals for all patients
      const patientIds = patients.map(p => p.id)
      const { data: allVitals, error: vitalsError } = await supabase
        .from('vitals')
        .select('*')
        .in('patient_id', patientIds)
        .order('recorded_at', { ascending: false })

      if (vitalsError) throw vitalsError

      // Create map of patient_id to latest vital
      const latestVitalsMap = new Map<string, Vital>()
      allVitals?.forEach(vital => {
        if (!latestVitalsMap.has(vital.patient_id)) {
          latestVitalsMap.set(vital.patient_id, vital)
        }
      })

      // Combine all data
      const dashboardData: PatientDashboardData[] = patients.map(patient => {
        const assignment = assignmentMap.get(patient.id)
        const room = assignment ? roomMap.get(assignment.room_id) : null
        const doctor = assignment?.assigned_doctor_id
          ? staffMap.get(assignment.assigned_doctor_id)
          : null
        const latestVitals = latestVitalsMap.get(patient.id) || null

        return {
          patient,
          roomNumber: room?.room_number || null,
          doctorName: doctor?.name || null,
          latestVitals,
          lastCheckedIn: latestVitals?.recorded_at || null,
        }
      })

      setPatientsData(dashboardData)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching patients dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatientsDashboard()
  }, [fetchPatientsDashboard])

  return { patientsData, loading, error, refetch: fetchPatientsDashboard }
}
