import { supabase } from '@/lib/supabase';
import type { VisualTaskType } from '@/types/visualTasks';

/**
 * Agent Tools Service
 * Provides action execution capabilities for the AI agent
 */

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  visualizationNeeded?: boolean;
  visualizationData?: {
    taskType: VisualTaskType;
    sourceRoomId?: string;
    targetRoomId?: string;
    taskId?: string;
  };
}

/**
 * Check in a new patient
 */
export async function checkInPatient(params: {
  name: string;
  age: number;
  gender: string;
  condition: string;
  severity?: string;
  roomId?: string;
  assignedDoctorId?: string;
  assignedNurseId?: string;
}): Promise<ToolResult> {
  try {
    const { name, age, condition, severity = 'stable', roomId, assignedDoctorId, assignedNurseId } = params;
    
    // Normalize gender to match database format (capitalize first letter)
    let gender = params.gender;
    if (gender) {
      gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      // Ensure it's one of: Male, Female, Other
      if (!['Male', 'Female', 'Other'].includes(gender)) {
        gender = 'Other';
      }
    }

    // 1. Create patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        name,
        age,
        gender,
        condition,
        severity,
        admission_date: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (patientError || !patient) {
      return {
        success: false,
        message: `Failed to create patient record: ${patientError?.message}`,
      };
    }

    // 2. Find or use provided room
    let targetRoom;
    if (roomId) {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      targetRoom = data;
    } else {
      // Find available room
      const { data: availableRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'available')
        .limit(1);
      targetRoom = availableRooms?.[0];
    }

    if (!targetRoom) {
      return {
        success: false,
        message: 'No available rooms found',
        data: { patient },
      };
    }

    // 3. Archive existing chat messages for the room (patient privacy)
    await archiveRoomChatMessages(targetRoom.id);

    // 4. Create room assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('room_assignments')
      .insert({
        room_id: targetRoom.id,
        patient_id: patient.id,
        assigned_doctor_id: assignedDoctorId,
        assigned_nurse_id: assignedNurseId,
        assigned_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (assignmentError) {
      return {
        success: false,
        message: `Failed to assign room: ${assignmentError.message}`,
        data: { patient },
      };
    }

    // 5. Update room status
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', targetRoom.id);

    // 6. Create initial vitals record
    await supabase.from('vitals').insert({
      patient_id: patient.id,
      room_id: targetRoom.id,
      heart_rate: 75,
      blood_pressure: '120/80',
      temperature: 98.6,
      oxygen_saturation: 98,
      respiratory_rate: 16,
      recorded_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Successfully checked in ${name} to room ${targetRoom.room_number}`,
      data: {
        patient,
        room: targetRoom,
        assignment,
      },
      visualizationNeeded: true,
      visualizationData: {
        taskType: 'patient_onboarding',
        targetRoomId: targetRoom.id,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error checking in patient: ${error.message}`,
    };
  }
}

/**
 * Discharge a patient
 */
export async function dischargePatient(params: {
  patientId: string;
}): Promise<ToolResult> {
  try {
    const { patientId } = params;

    // Get patient and assignment
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (!patient) {
      return {
        success: false,
        message: 'Patient not found',
      };
    }

    const { data: assignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .single();

    // Update patient status
    await supabase
      .from('patients')
      .update({
        is_active: false,
        discharge_date: new Date().toISOString(),
      })
      .eq('id', patientId);

    // Deactivate room assignment
    if (assignment) {
      await supabase
        .from('room_assignments')
        .update({
          is_active: false,
          discharged_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      // Archive chat messages for patient privacy
      await archiveRoomChatMessages(assignment.room_id);

      // Update room status to available
      await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', assignment.room_id);
    }

    return {
      success: true,
      message: `Successfully discharged ${patient.name}`,
      data: { patient },
      visualizationNeeded: true,
      visualizationData: {
        taskType: 'patient_discharge',
        sourceRoomId: assignment?.room_id,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error discharging patient: ${error.message}`,
    };
  }
}

/**
 * Transfer patient between rooms
 */
export async function transferPatient(params: {
  patientId: string;
  targetRoomId: string;
}): Promise<ToolResult> {
  try {
    const { patientId, targetRoomId } = params;

    // Get current assignment
    const { data: currentAssignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .single();

    if (!currentAssignment) {
      return {
        success: false,
        message: 'No active room assignment found for patient',
      };
    }

    const sourceRoomId = currentAssignment.room_id;

    // Get patient and rooms
    const [
      { data: patient },
      { data: sourceRoom },
      { data: targetRoom },
    ] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('rooms').select('*').eq('id', sourceRoomId).single(),
      supabase.from('rooms').select('*').eq('id', targetRoomId).single(),
    ]);

    if (!targetRoom || targetRoom.status !== 'available') {
      return {
        success: false,
        message: 'Target room is not available',
      };
    }

    // Deactivate current assignment
    await supabase
      .from('room_assignments')
      .update({
        is_active: false,
        discharged_at: new Date().toISOString(),
      })
      .eq('id', currentAssignment.id);

    // Create new assignment
    await supabase
      .from('room_assignments')
      .insert({
        room_id: targetRoomId,
        patient_id: patientId,
        assigned_doctor_id: currentAssignment.assigned_doctor_id,
        assigned_nurse_id: currentAssignment.assigned_nurse_id,
        assigned_at: new Date().toISOString(),
        is_active: true,
      });

    // Update room statuses
    await Promise.all([
      supabase.from('rooms').update({ status: 'available' }).eq('id', sourceRoomId),
      supabase.from('rooms').update({ status: 'occupied' }).eq('id', targetRoomId),
    ]);

    return {
      success: true,
      message: `Successfully transferred ${patient?.name} from room ${sourceRoom?.room_number} to room ${targetRoom.room_number}`,
      data: {
        patient,
        sourceRoom,
        targetRoom,
      },
      visualizationNeeded: true,
      visualizationData: {
        taskType: 'patient_transfer',
        sourceRoomId,
        targetRoomId,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error transferring patient: ${error.message}`,
    };
  }
}

/**
 * Create a task (food delivery, cleaning, equipment transfer, etc.)
 */
export async function createTask(params: {
  taskType: VisualTaskType;
  targetRoomId: string;
  sourceRoomId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  title?: string;
  assignedToId?: string;
  equipmentId?: string;
}): Promise<ToolResult> {
  try {
    const {
      taskType,
      targetRoomId,
      sourceRoomId,
      priority = 'medium',
      title,
      assignedToId,
      equipmentId,
    } = params;

    // Get target room details
    const { data: targetRoom } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', targetRoomId)
      .single();

    if (!targetRoom) {
      return {
        success: false,
        message: 'Target room not found',
      };
    }

    // Generate title if not provided
    const taskTitle = title || `${taskType.replace(/_/g, ' ')} - Room ${targetRoom.room_number}`;

    // Map visual task type to database task action
    const actionMap: Record<string, string> = {
      food_delivery: 'deliver_food',
      cleaning_request: 'clean_asset',
      equipment_transfer: 'move_asset',
      linen_restocking: 'restock_linen',
      medication_delivery: 'deliver_medication',
      maintenance_request: 'repair_asset',
    };

    const action = actionMap[taskType] || 'other';

    // Create task in database
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskTitle,
        reason: `${taskType} requested via AI agent`,
        priority,
        action,
        status: 'active',
        room_id: targetRoomId,
        equipment_id: equipmentId,
        assigned_to_id: assignedToId,
      })
      .select()
      .single();

    if (taskError || !task) {
      return {
        success: false,
        message: `Failed to create task: ${taskError?.message}`,
      };
    }

    return {
      success: true,
      message: `Successfully created ${taskType.replace(/_/g, ' ')} task for room ${targetRoom.room_number}`,
      data: {
        task,
        targetRoom,
      },
      visualizationNeeded: true,
      visualizationData: {
        taskType,
        sourceRoomId,
        targetRoomId,
        taskId: task.id,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error creating task: ${error.message}`,
    };
  }
}

/**
 * Update patient vitals
 */
export async function updateVitals(params: {
  patientId: string;
  heartRate?: number;
  bloodPressure?: string;
  temperature?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}): Promise<ToolResult> {
  try {
    const { patientId, ...vitalData } = params;

    // Get patient and room assignment
    const { data: assignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .single();

    if (!assignment) {
      return {
        success: false,
        message: 'No active room assignment found for patient',
      };
    }

    // Insert vitals record
    const { data: vitals, error: vitalsError } = await supabase
      .from('vitals')
      .insert({
        patient_id: patientId,
        room_id: assignment.room_id,
        heart_rate: vitalData.heartRate,
        blood_pressure: vitalData.bloodPressure,
        temperature: vitalData.temperature,
        oxygen_saturation: vitalData.oxygenSaturation,
        respiratory_rate: vitalData.respiratoryRate,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (vitalsError) {
      return {
        success: false,
        message: `Failed to update vitals: ${vitalsError.message}`,
      };
    }

    return {
      success: true,
      message: 'Successfully updated patient vitals',
      data: { vitals },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error updating vitals: ${error.message}`,
    };
  }
}

/**
 * Assign staff to a patient/room
 */
export async function assignStaff(params: {
  patientId: string;
  doctorId?: string;
  nurseId?: string;
}): Promise<ToolResult> {
  try {
    const { patientId, doctorId, nurseId } = params;

    // Get current assignment
    const { data: assignment } = await supabase
      .from('room_assignments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .single();

    if (!assignment) {
      return {
        success: false,
        message: 'No active room assignment found for patient',
      };
    }

    // Update assignment with staff
    const updateData: any = {};
    if (doctorId) updateData.assigned_doctor_id = doctorId;
    if (nurseId) updateData.assigned_nurse_id = nurseId;

    const { error: updateError } = await supabase
      .from('room_assignments')
      .update(updateData)
      .eq('id', assignment.id);

    if (updateError) {
      return {
        success: false,
        message: `Failed to assign staff: ${updateError.message}`,
      };
    }

    // Get staff details
    const staffDetails = [];
    if (doctorId) {
      const { data: doctor } = await supabase
        .from('staff')
        .select('*')
        .eq('id', doctorId)
        .single();
      if (doctor) staffDetails.push(`Dr. ${doctor.name}`);
    }
    if (nurseId) {
      const { data: nurse } = await supabase
        .from('staff')
        .select('*')
        .eq('id', nurseId)
        .single();
      if (nurse) staffDetails.push(`Nurse ${nurse.name}`);
    }

    return {
      success: true,
      message: `Successfully assigned ${staffDetails.join(' and ')} to patient`,
      data: { assignment: updateData },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error assigning staff: ${error.message}`,
    };
  }
}

/**
 * Create an alert for a room
 */
export async function createAlert(params: {
  roomId: string;
  alertType: string;
  message: string;
}): Promise<ToolResult> {
  try {
    const { roomId, alertType, message } = params;

    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .insert({
        room_id: roomId,
        alert_type: alertType,
        message,
        is_active: true,
      })
      .select()
      .single();

    if (alertError) {
      return {
        success: false,
        message: `Failed to create alert: ${alertError.message}`,
      };
    }

    return {
      success: true,
      message: `Successfully created ${alertType} alert`,
      data: { alert },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error creating alert: ${error.message}`,
    };
  }
}

/**
 * Get list of available staff
 */
export async function getAvailableStaff(role?: string): Promise<ToolResult> {
  try {
    let query = supabase.from('staff').select('*');

    if (role) {
      query = query.eq('role', role);
    }

    const { data: staff, error } = await query;

    if (error) {
      return {
        success: false,
        message: `Failed to fetch staff: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Found ${staff?.length || 0} staff members`,
      data: { staff },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error fetching staff: ${error.message}`,
    };
  }
}

/**
 * Archive all chat messages for a specific room
 * This is used to preserve patient privacy by moving old conversations to archived storage
 */
export async function archiveRoomChatMessages(roomId: string): Promise<ToolResult> {
  try {
    // Archive all non-archived messages for this room
    const { data: archivedMessages, error: archiveError } = await supabase
      .from('chat_messages')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('is_archived', false)
      .select();

    if (archiveError) {
      return {
        success: false,
        message: `Failed to archive chat messages: ${archiveError.message}`,
      };
    }

    const messageCount = archivedMessages?.length || 0;

    return {
      success: true,
      message: `Successfully archived ${messageCount} chat message(s) for room`,
      data: { archivedCount: messageCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error archiving chat messages: ${error.message}`,
    };
  }
}
