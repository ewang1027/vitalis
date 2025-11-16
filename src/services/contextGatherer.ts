import { supabase } from '@/lib/supabase';

/**
 * Context Gatherer Service
 * Fetches comprehensive, accurate context from the database for agent requests
 */

export interface RoomContext {
  room: any;
  patient: any;
  assignment: any;
  vitals: any[];
  equipment: any[];
  tasks: any[];
  alerts: any[];
  assignedStaff: {
    doctor: any;
    nurse: any;
  };
}

export interface PatientContext {
  patient: any;
  currentRoom: any;
  assignment: any;
  vitals: any[];
  assignedStaff: {
    doctor: any;
    nurse: any;
  };
  alerts: any[];
}

export interface EquipmentContext {
  equipment: any;
  currentRoom: any;
  assignedTasks: any[];
}

export interface HospitalContext {
  rooms: any[];
  patients: any[];
  equipment: any[];
  staff: any[];
  activeTasks: any[];
  activeAlerts: any[];
}

/**
 * Get comprehensive context for a specific room
 */
export async function getRoomContext(roomIdentifier: string | number): Promise<RoomContext | null> {
  try {
    // Find room by ID or room number
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .or(`id.eq.${roomIdentifier},room_number.eq.${roomIdentifier}`)
      .single();

    if (roomError || !room) {
      console.error('Room not found:', roomError);
      return null;
    }

    // Get active room assignment
    const { data: assignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('room_id', room.id)
      .eq('is_active', true)
      .single();

    // Get patient if assigned
    let patient = null;
    if (assignment?.patient_id) {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', assignment.patient_id)
        .single();
      patient = data;
    }

    // Get vitals for the room
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('room_id', room.id)
      .order('recorded_at', { ascending: false })
      .limit(10);

    // Get equipment in the room
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .eq('current_room_id', room.id);

    // Get active tasks for the room
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', room.id)
      .eq('status', 'active')
      .order('priority', { ascending: true });

    // Get active alerts for the room
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('room_id', room.id)
      .eq('is_active', true);

    // Get assigned staff
    let doctor = null;
    let nurse = null;
    if (assignment) {
      if (assignment.assigned_doctor_id) {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('id', assignment.assigned_doctor_id)
          .single();
        doctor = data;
      }
      if (assignment.assigned_nurse_id) {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('id', assignment.assigned_nurse_id)
          .single();
        nurse = data;
      }
    }

    return {
      room,
      patient,
      assignment,
      vitals: vitals || [],
      equipment: equipment || [],
      tasks: tasks || [],
      alerts: alerts || [],
      assignedStaff: {
        doctor,
        nurse,
      },
    };
  } catch (error) {
    console.error('Error gathering room context:', error);
    return null;
  }
}

/**
 * Get comprehensive context for a specific patient
 */
export async function getPatientContext(patientIdentifier: string | number): Promise<PatientContext | null> {
  try {
    // Find patient by ID or name
    let patient;
    if (typeof patientIdentifier === 'number') {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientIdentifier)
        .single();
      patient = data;
    } else {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', `%${patientIdentifier}%`)
        .eq('is_active', true)
        .single();
      patient = data;
    }

    if (!patient) {
      console.error('Patient not found');
      return null;
    }

    // Get active room assignment
    const { data: assignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
      .single();

    // Get current room
    let currentRoom = null;
    if (assignment?.room_id) {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', assignment.room_id)
        .single();
      currentRoom = data;
    }

    // Get vitals
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .limit(10);

    // Get alerts related to the patient's room
    let alerts = [];
    if (assignment?.room_id) {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('room_id', assignment.room_id)
        .eq('is_active', true);
      alerts = data || [];
    }

    // Get assigned staff
    let doctor = null;
    let nurse = null;
    if (assignment) {
      if (assignment.assigned_doctor_id) {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('id', assignment.assigned_doctor_id)
          .single();
        doctor = data;
      }
      if (assignment.assigned_nurse_id) {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('id', assignment.assigned_nurse_id)
          .single();
        nurse = data;
      }
    }

    return {
      patient,
      currentRoom,
      assignment,
      vitals: vitals || [],
      assignedStaff: {
        doctor,
        nurse,
      },
      alerts,
    };
  } catch (error) {
    console.error('Error gathering patient context:', error);
    return null;
  }
}

/**
 * Get comprehensive context for specific equipment
 */
export async function getEquipmentContext(equipmentIdentifier: string | number): Promise<EquipmentContext | null> {
  try {
    // Find equipment by ID or name
    let equipment;
    if (typeof equipmentIdentifier === 'number') {
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', equipmentIdentifier)
        .single();
      equipment = data;
    } else {
      const { data } = await supabase
        .from('equipment')
        .select('*')
        .ilike('name', `%${equipmentIdentifier}%`)
        .limit(1)
        .single();
      equipment = data;
    }

    if (!equipment) {
      console.error('Equipment not found');
      return null;
    }

    // Get current room
    let currentRoom = null;
    if (equipment.current_room_id) {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', equipment.current_room_id)
        .single();
      currentRoom = data;
    }

    // Get tasks assigned to this equipment
    const { data: assignedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('equipment_id', equipment.id)
      .eq('status', 'active');

    return {
      equipment,
      currentRoom,
      assignedTasks: assignedTasks || [],
    };
  } catch (error) {
    console.error('Error gathering equipment context:', error);
    return null;
  }
}

/**
 * Get overall hospital context
 */
export async function getHospitalContext(): Promise<HospitalContext> {
  try {
    const [
      { data: rooms },
      { data: patients },
      { data: equipment },
      { data: staff },
      { data: activeTasks },
      { data: activeAlerts },
    ] = await Promise.all([
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('patients').select('*').eq('is_active', true),
      supabase.from('equipment').select('*'),
      supabase.from('staff').select('*'),
      supabase.from('tasks').select('*').eq('status', 'active'),
      supabase.from('alerts').select('*').eq('is_active', true),
    ]);

    return {
      rooms: rooms || [],
      patients: patients || [],
      equipment: equipment || [],
      staff: staff || [],
      activeTasks: activeTasks || [],
      activeAlerts: activeAlerts || [],
    };
  } catch (error) {
    console.error('Error gathering hospital context:', error);
    return {
      rooms: [],
      patients: [],
      equipment: [],
      staff: [],
      activeTasks: [],
      activeAlerts: [],
    };
  }
}

/**
 * Extract room number from text
 */
export function extractRoomNumber(text: string): number | null {
  const match = text.match(/\b(?:room\s*)?(\d{3})\b/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Find available room for patient admission
 */
export async function findAvailableRoom(roomType?: string): Promise<any | null> {
  try {
    console.log('🔍 [FIND_ROOM] Searching for available room...', roomType ? `Type: ${roomType}` : 'Any type');
    
    let query = supabase
      .from('rooms')
      .select('*')
      .in('status', ['ready', 'available']); // Check both 'ready' and 'available' statuses

    if (roomType) {
      query = query.eq('room_type', roomType);
    }

    const { data: rooms, error } = await query.order('room_number', { ascending: true }).limit(1);

    if (error) {
      console.error('❌ [FIND_ROOM] Database error:', error);
      return null;
    }

    console.log('🔍 [FIND_ROOM] Found rooms:', rooms?.length || 0);
    if (rooms && rooms.length > 0) {
      console.log('✅ [FIND_ROOM] Selected room:', rooms[0].id, rooms[0].room_number, 'Status:', rooms[0].status);
    } else {
      console.warn('⚠️ [FIND_ROOM] No available rooms found!');
    }

    return rooms && rooms.length > 0 ? rooms[0] : null;
  } catch (error) {
    console.error('❌ [FIND_ROOM] Error finding available room:', error);
    return null;
  }
}
