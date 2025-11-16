import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/types/wardops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { sendChatMessage, createSystemPrompt, ChatMessage as OpenRouterChatMessage } from '@/lib/openrouter';
import { toast } from 'sonner';
import { parseTaskCommand } from '@/services/taskCommandParser';
import { useTaskSubscription } from '@/hooks/useTaskSubscription';
import { TASK_CONFIGS, VisualTaskType } from '@/types/visualTasks';
import { detectTaskFromConversation } from '@/services/conversationTaskDetector';

interface ChatInterfaceProps {
  initialMessages: any[];
  userId?: string;
  roomId?: string | null;
  contextData?: {
    rooms?: any[];
    equipment?: any[];
    tasks?: any[];
    patients?: any[];
  };
  onDataUpdate?: () => void; // Callback to refresh parent data
}

export function ChatInterface({ initialMessages, userId, roomId, contextData, onDataUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>(initialMessages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { createTask } = useTaskSubscription();

  // Get current room info
  const currentRoom = roomId ? contextData?.rooms?.find(r => r.id === roomId) : null;
  const roomName = currentRoom?.room_name || currentRoom?.room_number || roomId;

  // Fetch detailed room information when room is selected
  useEffect(() => {
    async function fetchRoomDetails() {
      if (!roomId) {
        setRoomDetails(null);
        return;
      }

      try {
        // Fetch active room assignment
        const { data: assignment, error: assignmentError } = await supabase
          .from('room_assignments')
          .select('*')
          .eq('room_id', roomId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (assignmentError) throw assignmentError;

        let patient = null;
        let vitals = null;

        if (assignment) {
          // Fetch patient details
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', assignment.patient_id)
            .single();

          if (!patientError) patient = patientData;

          // Fetch latest vitals
          const { data: vitalsData, error: vitalsError } = await supabase
            .from('vitals')
            .select('*')
            .eq('patient_id', assignment.patient_id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!vitalsError) vitals = vitalsData;
        }

        // Fetch equipment in this room
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('*')
          .eq('current_room_id', roomId);

        if (equipmentError) throw equipmentError;

        setRoomDetails({
          room: currentRoom,
          assignment,
          patient,
          vitals,
          equipment: equipment || []
        });

        console.log('📋 Room details loaded:', { patient, vitals, equipment });
      } catch (error) {
        console.error('Error fetching room details:', error);
        setRoomDetails(null);
      }
    }

    fetchRoomDetails();
  }, [roomId, currentRoom]);

  // Generate AI-powered quick prompts based on current room
  const generateQuickPrompts = useCallback(async () => {
    if (!roomId || !currentRoom) {
      // Default prompts when no room is selected
      setQuickPrompts([
        "Check in new patient",
        "Show urgent tasks",
        "Room status overview"
      ]);
      return;
    }

    setIsGeneratingPrompts(true);
    try {
      // Create a prompt to generate context-aware quick actions
      const systemPrompt: OpenRouterChatMessage = {
        role: 'system',
        content: `You are a hospital operations AI. Generate exactly 3 short, actionable quick prompt suggestions for ${roomName}.
Consider the room type and common hospital operations. Each prompt should be:
- Short (under 8 words)
- Actionable and specific to this room
- Relevant to hospital staff needs

Return ONLY the 3 prompts, one per line, no numbering, no extra text.`
      };

      const userPrompt: OpenRouterChatMessage = {
        role: 'user',
        content: `Room: ${roomName}\nRoom Type: ${currentRoom.room_type || 'general'}\n\nGenerate 3 most common action prompts for this room.`
      };

      const response = await sendChatMessage([systemPrompt, userPrompt], 'anthropic/claude-3-haiku');

      // Parse the response into individual prompts
      const prompts = response
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.match(/^\d+\./))
        .slice(0, 3);

      if (prompts.length === 3) {
        setQuickPrompts(prompts);
      } else {
        // Fallback to default room prompts if parsing fails
        setQuickPrompts([
          `Send food to ${roomName}`,
          `Clean ${roomName}`,
          `Check status of ${roomName}`
        ]);
      }
    } catch (error) {
      console.error('Error generating quick prompts:', error);
      // Fallback prompts on error
      setQuickPrompts([
        `Send food to ${roomName}`,
        `Clean ${roomName}`,
        `Check status of ${roomName}`
      ]);
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, [roomId, currentRoom, roomName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update messages when initialMessages changes
  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  // Generate quick prompts when room changes
  useEffect(() => {
    generateQuickPrompts();
  }, [generateQuickPrompts]);

  // Save message to Supabase
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId || null,
          room_id: roomId || null,
          role,
          content,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving message to database:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        // Don't show error to user - message saving is not critical
        return null;
      }
      return data;
    } catch (error) {
      console.error('Exception saving message:', error);
      // Don't show error to user - message saving is not critical
      return null;
    }
  };

  // Helper function to find first available room (prefers general patient rooms)
  const findAvailableRoom = async (): Promise<string | null> => {
    try {
      // First try to find general patient rooms
      const generalRoomTypes = ['patient room', 'general', 'ward', 'standard', 'private room', 'semi-private'];
      
      for (const roomType of generalRoomTypes) {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, room_name, room_number')
          .in('status', ['ready', 'available'])
          .ilike('room_type', `%${roomType}%`)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          console.log(`✅ Found available ${roomType}: ${data.id}`);
          return data.id;
        }
      }

      // If no general rooms, try any available room
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .in('status', ['ready', 'available'])
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.error('Error finding available room:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error querying rooms:', error);
      return null;
    }
  };

  // Helper function to discharge a patient
  const dischargePatient = async (roomId: string) => {
    try {
      console.log(`🚪 Discharging patient from ${roomId}...`);

      // Get active assignment for this room
      const { data: assignment, error: assignmentError } = await supabase
        .from('room_assignments')
        .select('*, patients(*)')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();

      if (assignmentError || !assignment) {
        console.error('No active patient in this room');
        toast.error('No patient found in this room');
        return null;
      }

      const patient = assignment.patients;
      
      // Deactivate the room assignment
      const { error: updateAssignmentError } = await supabase
        .from('room_assignments')
        .update({
          is_active: false,
          discharged_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      if (updateAssignmentError) {
        console.error('Error updating room assignment:', updateAssignmentError);
        throw updateAssignmentError;
      }

      // Mark patient as inactive
      const { error: updatePatientError } = await supabase
        .from('patients')
        .update({
          is_active: false,
          discharge_date: new Date().toISOString()
        })
        .eq('id', assignment.patient_id);

      if (updatePatientError) {
        console.error('Error updating patient:', updatePatientError);
        // Continue even if patient update fails
      }

      // Update room status to ready
      const { error: updateRoomError } = await supabase
        .from('rooms')
        .update({ status: 'ready' })
        .eq('id', roomId);

      if (updateRoomError) {
        console.error('Error updating room status:', updateRoomError);
        // Continue even if room update fails
      }

      console.log(`✅ Patient ${patient?.name} discharged from ${roomId}`);
      return patient;
    } catch (error) {
      console.error('Error discharging patient:', error);
      return null;
    }
  };

  // Helper function to create a patient record with defaults for missing fields
  const createPatient = async (patientInfo: {
    name?: string;
    age?: number;
    gender?: string;
    severity?: string;
    condition?: string;
  }) => {
    try {
      console.log('🏥 [CREATE_PATIENT] Starting patient creation...');
      console.log('🏥 [CREATE_PATIENT] Input patientInfo:', JSON.stringify(patientInfo, null, 2));
      
      // Use defaults for missing required fields
      const patientData = {
        name: patientInfo.name || 'Unknown Patient',
        age: patientInfo.age || 0,
        gender: patientInfo.gender || 'Unknown',
        severity: patientInfo.severity || 'stable',
        condition: patientInfo.condition || null,
        admission_date: new Date().toISOString(),
        discharge_date: null,
        is_active: true,
      };

      console.log('🏥 [CREATE_PATIENT] Prepared patient data:', JSON.stringify(patientData, null, 2));
      console.log('🏥 [CREATE_PATIENT] Attempting Supabase insert...');

      const { data, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();

      if (error) {
        console.error('❌ [CREATE_PATIENT] Supabase error:', error);
        console.error('❌ [CREATE_PATIENT] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Don't throw - we'll continue without patient record if needed
        return null;
      }

      console.log('✅ [CREATE_PATIENT] Patient created successfully!');
      console.log('✅ [CREATE_PATIENT] Created patient data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('❌ [CREATE_PATIENT] Exception:', error);
      console.error('❌ [CREATE_PATIENT] Exception stack:', (error as Error).stack);
      return null;
    }
  };

  // Helper function to create room assignment
  const createRoomAssignment = async (roomId: string, patientId: string) => {
    try {
      console.log('🔗 [CREATE_ASSIGNMENT] Starting room assignment...');
      console.log('🔗 [CREATE_ASSIGNMENT] Room ID:', roomId);
      console.log('🔗 [CREATE_ASSIGNMENT] Patient ID:', patientId);
      
      const assignmentData = {
        room_id: roomId,
        patient_id: patientId,
        assigned_at: new Date().toISOString(),
        is_active: true,
      };
      
      console.log('🔗 [CREATE_ASSIGNMENT] Assignment data:', JSON.stringify(assignmentData, null, 2));
      console.log('🔗 [CREATE_ASSIGNMENT] Attempting Supabase insert...');
      
      const { data, error } = await supabase
        .from('room_assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) {
        console.error('❌ [CREATE_ASSIGNMENT] Supabase error:', error);
        console.error('❌ [CREATE_ASSIGNMENT] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('✅ [CREATE_ASSIGNMENT] Room assignment created successfully!');
      console.log('✅ [CREATE_ASSIGNMENT] Assignment data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('❌ [CREATE_ASSIGNMENT] Exception:', error);
      console.error('❌ [CREATE_ASSIGNMENT] Exception stack:', (error as Error).stack);
      return null;
    }
  };

  // Helper function to extract patient info from message
  const extractPatientInfo = (message: string): {
    name?: string;
    age?: number;
    gender?: string;
    severity?: string;
    condition?: string;
  } => {
    console.log('📝 [EXTRACT_INFO] Extracting patient info from message:', message);
    const lowerMsg = message.toLowerCase();
    
    // Extract name (look for common patterns)
    let name: string | undefined;
    const namePatterns = [
      /patient\s+(?:name\s+is\s+)?([a-z]+(?:\s+[a-z]+)?)/i,
      /name\s+is\s+([a-z]+(?:\s+[a-z]+)?)/i,
      /(?:admit|check\s*in)\s+([a-z]+(?:\s+[a-z]+)?)/i,
      /^([a-z]+(?:\s+[a-z]+)?)\s*(?:,|$)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }
    
    // Extract age
    let age: number | undefined;
    const ageMatch = message.match(/(?:age|aged?)\s*:?\s*(\d+)/i);
    if (ageMatch) {
      age = parseInt(ageMatch[1]);
    }
    
    // Extract gender
    let gender: string | undefined;
    if (lowerMsg.includes('male') && !lowerMsg.includes('female')) {
      gender = 'Male';
    } else if (lowerMsg.includes('female')) {
      gender = 'Female';
    }
    
    // Extract severity
    let severity: string | undefined;
    if (lowerMsg.includes('critical')) {
      severity = 'critical';
    } else if (lowerMsg.includes('moderate')) {
      severity = 'moderate';
    } else if (lowerMsg.includes('stable')) {
      severity = 'stable';
    }
    
    // Extract condition
    let condition: string | undefined;
    const conditionMatch = message.match(/(?:condition|diagnosis)\s*:?\s*([a-z\s]+)/i);
    if (conditionMatch && conditionMatch[1]) {
      condition = conditionMatch[1].trim();
    }
    
    const extractedInfo = { name, age, gender, severity, condition };
    console.log('📝 [EXTRACT_INFO] Extraction complete:', JSON.stringify(extractedInfo, null, 2));
    return extractedInfo;
  };

  // Helper function to determine if patient needs specialized room
  const findBestRoomForPatient = async (patientInfo: {
    name?: string;
    age?: number;
    gender?: string;
    severity?: string;
    condition?: string;
  }): Promise<{ roomId: string; roomName?: string; roomType?: string } | null> => {
    try {
      const condition = patientInfo.condition?.toLowerCase() || '';
      const severity = patientInfo.severity?.toLowerCase() || '';
      
      // Check if patient needs specialized room based on condition
      const specializedNeeds: Record<string, string[]> = {
        'x-ray': ['fracture', 'broken', 'x-ray', 'imaging', 'scan'],
        'icu': ['critical', 'intensive'],
        'surgery': ['surgery', 'operation', 'surgical', 'post-op'],
        'emergency': ['emergency', 'trauma', 'urgent'],
        'isolation': ['infection', 'contagious', 'covid', 'isolation'],
      };
      
      // Check if patient needs specialized room
      for (const [roomType, keywords] of Object.entries(specializedNeeds)) {
        const needsSpecialized = keywords.some(keyword => 
          condition.includes(keyword) || severity.includes(keyword)
        );
        
        if (needsSpecialized) {
          const { data, error } = await supabase
            .from('rooms')
            .select('id, room_name, room_number, room_type')
            .in('status', ['ready', 'available'])
            .ilike('room_type', `%${roomType}%`)
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (data && !error) {
            console.log(`✅ Patient needs specialized care - routing to ${roomType}: ${data.id}`);
            return {
              roomId: data.id,
              roomName: data.room_name || data.room_number,
              roomType: data.room_type
            };
          }
        }
      }
      
      // Default: Find general patient room
      const generalRoom = await findAvailableRoom();
      if (generalRoom) {
        // Get room details
        const { data } = await supabase
          .from('rooms')
          .select('room_name, room_number, room_type')
          .eq('id', generalRoom)
          .maybeSingle();
        
        console.log(`✅ Assigning to general patient room: ${generalRoom}`);
        return {
          roomId: generalRoom,
          roomName: data?.room_name || data?.room_number,
          roomType: data?.room_type
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding best room for patient:', error);
      return null;
    }
  };

  // Helper function to find the best room for a task type
  const findBestRoomForTask = async (taskType: string): Promise<string | null> => {
    try {
      // Define room type mappings for different task types
      const roomTypeMap: Record<string, string[]> = {
        'food_delivery': ['kitchen', 'cafeteria', 'food service', 'dining'],
        'medication_delivery': ['pharmacy', 'medication room', 'dispensary'],
        'linen_restocking': ['linen storage', 'supply room', 'storage'],
        'cleaning_request': ['housekeeping', 'janitorial'],
        'maintenance_request': ['maintenance', 'facilities']
      };

      const preferredTypes = roomTypeMap[taskType] || [];

      // First, try to find a room matching the preferred types
      if (preferredTypes.length > 0) {
        for (const roomType of preferredTypes) {
          const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .ilike('room_type', `%${roomType}%`)
            .limit(1)
            .maybeSingle();

          if (data && !error) {
            console.log(`✅ Found ${roomType} room for ${taskType}: ${data.id}`);
            return data.id;
          }
        }
      }

      // If no specific room type found, try to find "central help desk" or "entrance"
      const fallbackTypes = ['central help desk', 'help desk', 'entrance', 'reception', 'lobby'];
      for (const fallbackType of fallbackTypes) {
        const { data, error } = await supabase
          .from('rooms')
          .select('id')
          .ilike('room_type', `%${fallbackType}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          console.log(`✅ Using fallback room (${fallbackType}) for ${taskType}: ${data.id}`);
          return data.id;
        }
      }

      // Try to find by room name as well
      for (const fallbackType of fallbackTypes) {
        const { data, error } = await supabase
          .from('rooms')
          .select('id')
          .ilike('room_name', `%${fallbackType}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          console.log(`✅ Using fallback room by name (${fallbackType}) for ${taskType}: ${data.id}`);
          return data.id;
        }
      }

      // Last resort: just get the first room we can find
      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        console.log(`⚠️ Using first available room as last resort for ${taskType}: ${data.id}`);
        return data.id;
      }

      console.error('❌ No rooms found in database');
      return null;
    } catch (error) {
      console.error('Error finding best room for task:', error);
      return null;
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    setIsLoading(true);
    setInput('');

    try {
      // Save user message to database
      const userMessageData = await saveMessage('user', messageText);

      // Add user message to UI immediately
      const userMessage = {
        id: userMessageData?.id || `temp-${Date.now()}`,
        role: 'user',
        content: messageText,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Try to parse as task command first
      const availableRoomIds = contextData?.rooms?.map(r => r.id) || [];
      const parsedTask = await parseTaskCommand(messageText, availableRoomIds);

      if (parsedTask) {
        // Validate and potentially reroute the target room
        let finalTargetRoomId = parsedTask.targetRoomId;
        
        // Check if the target room exists
        const { data: roomExists } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', parsedTask.targetRoomId)
          .maybeSingle();
        
        // If room doesn't exist, use intelligent routing
        if (!roomExists) {
          console.log(`⚠️ Room ${parsedTask.targetRoomId} not found, using intelligent routing...`);
          const bestRoom = await findBestRoomForTask(parsedTask.type);
          if (bestRoom) {
            finalTargetRoomId = bestRoom;
            console.log(`✅ Rerouted task to ${finalTargetRoomId}`);
          } else {
            toast.error('No suitable room found for this task');
            throw new Error('No suitable room found');
          }
        }
        
        // Create task
        const taskConfig = TASK_CONFIGS[parsedTask.type];
        await createTask({
          type: parsedTask.type,
          title: `${taskConfig.icon} ${parsedTask.type.replace(/_/g, ' ')}`,
          description: parsedTask.description,
          targetRoomId: finalTargetRoomId,
          sourceRoomId: parsedTask.sourceRoomId,
          status: 'pending',
          priority: parsedTask.priority,
          estimatedDuration: taskConfig.defaultDuration,
        });

        // Handle patient discharge
        if (parsedTask.type === 'patient_discharge') {
          try {
            const patient = await dischargePatient(finalTargetRoomId);
            
            if (patient) {
              // Get room details for feedback
              const { data: roomData } = await supabase
                .from('rooms')
                .select('room_name, room_number, room_type')
                .eq('id', finalTargetRoomId)
                .maybeSingle();
              
              const roomDisplay = roomData?.room_name || roomData?.room_number || finalTargetRoomId;
              
              console.log(`✅ ${patient.name} discharged from ${roomDisplay}`);
              toast.success(`✅ ${patient.name} discharged from ${roomDisplay}`);
              
              // Trigger data refresh in parent to update UI
              console.log('🔄 [REFRESH] Triggering parent data refresh...');
              onDataUpdate?.();
              
              // Refresh room details if we're viewing this room
              if (roomId === finalTargetRoomId) {
                setRoomDetails(null);
              }
            }
          } catch (error) {
            console.error('Error in patient discharge:', error);
            toast.error('Failed to discharge patient');
          }
        }

        // Handle patient onboarding - create patient record and room assignment
        if (parsedTask.type === 'patient_onboarding') {
          try {
            console.log('👤 [ONBOARDING] Starting patient onboarding flow...');
            console.log('👤 [ONBOARDING] Original message:', messageText);
            
            // Extract patient info from the original message
            const patientInfo = extractPatientInfo(messageText);
            console.log('👤 [ONBOARDING] Extracted patient info:', JSON.stringify(patientInfo, null, 2));
            
            // Find best room based on patient condition
            const roomSelection = await findBestRoomForPatient(patientInfo);
            if (roomSelection) {
              finalTargetRoomId = roomSelection.roomId;
              console.log('👤 [ONBOARDING] Selected room:', finalTargetRoomId, 'Room type:', roomSelection.roomType);
            }
            
            console.log('👤 [ONBOARDING] Final target room:', finalTargetRoomId);
            
            // Create patient record
            console.log('👤 [ONBOARDING] Step 1: Creating patient record...');
            const patient = await createPatient(patientInfo);
            
            if (patient) {
              console.log('👤 [ONBOARDING] Step 2: Creating room assignment...');
              // Create room assignment
              const assignment = await createRoomAssignment(finalTargetRoomId, patient.id);
              
              if (assignment) {
                console.log('👤 [ONBOARDING] Step 3: Updating room status...');
                // Update room status
                const { error: roomUpdateError } = await supabase
                  .from('rooms')
                  .update({ status: 'occupied' })
                  .eq('id', finalTargetRoomId);
                
                if (roomUpdateError) {
                  console.error('❌ [ONBOARDING] Room update error:', roomUpdateError);
                } else {
                  console.log('✅ [ONBOARDING] Room status updated to occupied');
                }
              }
              
              // Get room details for feedback
              const { data: roomData } = await supabase
                .from('rooms')
                .select('room_name, room_number, room_type')
                .eq('id', finalTargetRoomId)
                .maybeSingle();
              
              const roomDisplay = roomData?.room_name || roomData?.room_number || finalTargetRoomId;
              const roomTypeInfo = roomData?.room_type ? ` (${roomData.room_type})` : '';
              
              console.log(`✅ [ONBOARDING] Patient ${patient.name} admitted to ${roomDisplay}`);
              toast.success(`✅ ${patient.name} admitted to ${roomDisplay}${roomTypeInfo}`);
              
              // Trigger data refresh in parent to update UI
              console.log('🔄 [REFRESH] Triggering parent data refresh...');
              onDataUpdate?.();
            } else {
              console.error('❌ [ONBOARDING] Patient creation failed!');
              // Even if patient creation fails, continue with task
              console.log('⚠️ [ONBOARDING] Continuing without patient record');
              await supabase
                .from('rooms')
                .update({ status: 'occupied' })
                .eq('id', finalTargetRoomId);
            }
          } catch (error) {
            console.error('❌ [ONBOARDING] Exception in patient onboarding:', error);
            console.error('❌ [ONBOARDING] Exception stack:', (error as Error).stack);
            // Don't fail the whole task - just log and continue
          }
        }

        // Add success message
        const rerouteNote = finalTargetRoomId !== parsedTask.targetRoomId ? ` (routed to ${finalTargetRoomId})` : '';
        const taskMessage = {
          id: `task-${Date.now()}`,
          role: 'assistant',
          content: `✅ Task created! ${taskConfig.icon} ${parsedTask.type.replace(/_/g, ' ')} for ${finalTargetRoomId}${rerouteNote}. You can see the task visualized in the 3D map.`,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, taskMessage]);
      } else {
        // Not a task command, send to AI
        // Prepare message history for OpenRouter
        const messageHistory = messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

        // Add system prompt with context (including room details if viewing a room)
        const systemPrompt = createSystemPrompt(contextData, roomDetails);
        const apiMessages = [systemPrompt, ...messageHistory, { role: 'user' as const, content: messageText }];

        // Get AI response from OpenRouter
        const aiResponse = await sendChatMessage(apiMessages);
        console.log('🤖 [AI_RESPONSE] Full AI Response:', aiResponse);
        console.log('🤖 [AI_RESPONSE] Response length:', aiResponse.length, 'chars');

        // Check if AI response contains a task execution command
        console.log('🔍 [TASK_DETECT] Searching for [EXECUTE_TASK: ...] command in response...');
        const taskCommandMatch = aiResponse.match(/\[EXECUTE_TASK:\s*(\w+)\s+(?:from\s+room-(\d+|AVAILABLE)\s+)?to\s+room-(\d+|AVAILABLE)\]/i);
        console.log('🔍 [TASK_DETECT] Regex match result:', taskCommandMatch);
        
        if (!taskCommandMatch) {
          console.warn('⚠️ [TASK_DETECT] No [EXECUTE_TASK: ...] command found in AI response!');
          console.warn('⚠️ [TASK_DETECT] AI may not have included the required command format');
        } else {
          console.log('✅ [TASK_DETECT] Task command detected!');
          console.log('✅ [TASK_DETECT] Full match:', taskCommandMatch[0]);
          console.log('✅ [TASK_DETECT] Task type:', taskCommandMatch[1]);
          console.log('✅ [TASK_DETECT] Source room:', taskCommandMatch[2] || 'N/A');
          console.log('✅ [TASK_DETECT] Target room:', taskCommandMatch[3]);
        }

        if (taskCommandMatch) {
          const [fullMatch, taskType, sourceRoom, targetRoom] = taskCommandMatch;

          console.log('✅ Task command detected:', { taskType, sourceRoom, targetRoom });

          // Remove the command from the displayed message
          const displayMessage = aiResponse.replace(fullMatch, '').trim();

          // Create the task
          const taskConfig = TASK_CONFIGS[taskType as VisualTaskType];
          if (taskConfig) {
            try {
              // Resolve AVAILABLE placeholder by querying database
              let targetRoomId = targetRoom === 'AVAILABLE' ? null : `room-${targetRoom}`;

              if (targetRoom === 'AVAILABLE') {
                const availableRoom = await findAvailableRoom();
                if (availableRoom) {
                  targetRoomId = availableRoom;
                  console.log(`✅ Found available room: ${targetRoomId}`);
                } else {
                  throw new Error('No available rooms found');
                }
              }

              if (!targetRoomId) {
                throw new Error('Could not determine target room');
              }

              // Validate target room exists, use intelligent routing if not
              const { data: roomExists } = await supabase
                .from('rooms')
                .select('id')
                .eq('id', targetRoomId)
                .maybeSingle();
              
              let finalRoomId = targetRoomId;
              let wasRerouted = false;
              
              if (!roomExists) {
                console.log(`⚠️ Room ${targetRoomId} not found, using intelligent routing...`);
                const bestRoom = await findBestRoomForTask(taskType);
                if (bestRoom) {
                  finalRoomId = bestRoom;
                  wasRerouted = true;
                  console.log(`✅ Rerouted task to ${finalRoomId}`);
                } else {
                  // Last resort: try to find any room
                  const anyRoom = await findAvailableRoom();
                  if (anyRoom) {
                    finalRoomId = anyRoom;
                    wasRerouted = true;
                    console.log(`⚠️ Using any available room: ${finalRoomId}`);
                  } else {
                    throw new Error('No suitable room found');
                  }
                }
              }

              await createTask({
                type: taskType as VisualTaskType,
                title: `${taskConfig.icon} ${taskType.replace(/_/g, ' ')}`,
                description: `Task created from conversation`,
                targetRoomId: finalRoomId,
                sourceRoomId: sourceRoom && sourceRoom !== 'AVAILABLE' ? `room-${sourceRoom}` : undefined,
                status: 'pending',
                priority: 'medium',
                estimatedDuration: taskConfig.defaultDuration,
              });

              // Handle patient discharge
              if (taskType === 'patient_discharge') {
                try {
                  const patient = await dischargePatient(finalRoomId);
                  
                  if (patient) {
                    // Get room details for feedback
                    const { data: roomData } = await supabase
                      .from('rooms')
                      .select('room_name, room_number, room_type')
                      .eq('id', finalRoomId)
                      .maybeSingle();
                    
                    const roomDisplay = roomData?.room_name || roomData?.room_number || finalRoomId;
                    
                    console.log(`✅ ${patient.name} discharged from ${roomDisplay}`);
                    toast.success(`✅ ${patient.name} discharged from ${roomDisplay}`);
                    
                    // Trigger data refresh in parent to update UI
                    console.log('🔄 [REFRESH] Triggering parent data refresh...');
                    onDataUpdate?.();
                    
                    // Refresh room details if we're viewing this room
                    if (roomId === finalRoomId) {
                      setRoomDetails(null);
                    }
                  }
                } catch (error) {
                  console.error('Error in patient discharge:', error);
                  toast.error('Failed to discharge patient');
                }
              }

              // Handle patient onboarding - create patient record and room assignment
              if (taskType === 'patient_onboarding') {
                try {
                  console.log('👤 [ONBOARDING-AI] Starting patient onboarding from AI command...');
                  // Extract patient info from AI response and user messages
                  const conversationText = [...messages.slice(-3).map(m => m.content), messageText, aiResponse].join(' ');
                  console.log('👤 [ONBOARDING-AI] Conversation text for extraction:', conversationText);
                  const patientInfo = extractPatientInfo(conversationText);
                  console.log('👤 [ONBOARDING-AI] Extracted patient info:', JSON.stringify(patientInfo, null, 2));
                  
                  // Find best room based on patient condition
                  const roomSelection = await findBestRoomForPatient(patientInfo);
                  if (roomSelection) {
                    finalRoomId = roomSelection.roomId;
                  }
                  
                  // Create patient record
                  const patient = await createPatient(patientInfo);
                  
                  if (patient) {
                    // Create room assignment
                    await createRoomAssignment(finalRoomId, patient.id);
                    
                    // Update room status
                    await supabase
                      .from('rooms')
                      .update({ status: 'occupied' })
                      .eq('id', finalRoomId);
                    
                    // Get room details for feedback
                    const { data: roomData } = await supabase
                      .from('rooms')
                      .select('room_name, room_number, room_type')
                      .eq('id', finalRoomId)
                      .maybeSingle();
                    
                    const roomDisplay = roomData?.room_name || roomData?.room_number || finalRoomId;
                    const roomTypeInfo = roomData?.room_type ? ` (${roomData.room_type})` : '';
                    
                    console.log(`✅ Patient ${patient.name} admitted to ${roomDisplay}`);
                    toast.success(`✅ ${patient.name} admitted to ${roomDisplay}${roomTypeInfo}`);
                    
                    // Trigger data refresh in parent to update UI
                    console.log('🔄 [REFRESH] Triggering parent data refresh...');
                    onDataUpdate?.();
                  } else {
                    // Even if patient creation fails, continue with task
                    console.log('⚠️ Continuing without patient record');
                    await supabase
                      .from('rooms')
                      .update({ status: 'occupied' })
                      .eq('id', finalRoomId);
                  }
                } catch (error) {
                  console.error('Error in patient onboarding:', error);
                  // Don't fail the whole task - just log and continue
                }
              }

              console.log('Task created successfully');

              // Add success indicator to message with room info
              let roomInfo = '';
              if (targetRoom === 'AVAILABLE') {
                roomInfo = ` Assigned to ${finalRoomId}.`;
              } else if (wasRerouted) {
                roomInfo = ` (routed to ${finalRoomId})`;
              }
              const finalMessage = `${displayMessage}\n\n✅ Task created!${roomInfo} You can see it visualized in the 3D map.`;

              // Save and display the modified message
              const aiMessageData = await saveMessage('assistant', finalMessage);
              const aiMessage = {
                id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                role: 'assistant',
                content: finalMessage,
                created_at: new Date().toISOString()
              };
              setMessages(prev => [...prev, aiMessage]);
            } catch (taskError) {
              console.error('Error creating task:', taskError);
              // Fall through to display the AI message without task creation
              const aiMessageData = await saveMessage('assistant', displayMessage);
              const aiMessage = {
                id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                role: 'assistant',
                content: displayMessage + '\n\n⚠️ Note: Task visualization is temporarily unavailable.',
                created_at: new Date().toISOString()
              };
              setMessages(prev => [...prev, aiMessage]);
            }
          } else {
            console.warn('Unknown task type:', taskType);
            // Display message without task creation
            const aiMessageData = await saveMessage('assistant', displayMessage);
            const aiMessage = {
              id: aiMessageData?.id || `temp-ai-${Date.now()}`,
              role: 'assistant',
              content: displayMessage,
              created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        } else {
          console.log('⚠️ No [EXECUTE_TASK: ...] command found in AI response');
          
          // FALLBACK: Check if AI is responding to our patient check-in question
          const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
          const isPatientCheckInFlow = lastAssistantMessage?.content.toLowerCase().includes("what's the patient's name");
          
          if (isPatientCheckInFlow && aiResponse.toLowerCase().includes('checking in')) {
            console.log('🔄 FALLBACK: Detected patient check-in flow without [EXECUTE_TASK] command');
            console.log('🔄 Attempting to extract patient name from user message:', messageText);
            
            // Extract patient info and create task manually
            const patientInfo = extractPatientInfo(messageText);
            console.log('📋 Extracted patient info:', patientInfo);
            
            try {
              // Find best room
              const roomSelection = await findBestRoomForPatient(patientInfo);
              const targetRoomId = roomSelection?.roomId || await findAvailableRoom();
              
              if (targetRoomId) {
                console.log('🏥 Selected room:', targetRoomId);
                
                // Create the task
                const taskConfig = TASK_CONFIGS['patient_onboarding'];
                await createTask({
                  type: 'patient_onboarding',
                  title: `${taskConfig.icon} patient_onboarding`,
                  description: `Checking in ${patientInfo.name || 'patient'}`,
                  targetRoomId,
                  status: 'pending',
                  priority: 'medium',
                  estimatedDuration: taskConfig.defaultDuration,
                });
                
                console.log('✅ Task created via fallback mechanism');
                
                // Create patient and assignment
                const patient = await createPatient(patientInfo);
                if (patient) {
                  await createRoomAssignment(targetRoomId, patient.id);
                  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', targetRoomId);
                  
                  const { data: roomData } = await supabase
                    .from('rooms')
                    .select('room_name, room_number, room_type')
                    .eq('id', targetRoomId)
                    .maybeSingle();
                  
                  const roomDisplay = roomData?.room_name || roomData?.room_number || targetRoomId;
                  const roomTypeInfo = roomData?.room_type ? ` (${roomData.room_type})` : '';
                  
                  toast.success(`✅ ${patient.name} admitted to ${roomDisplay}${roomTypeInfo}`);
                  
                  // Update AI response to include success
                  const successMessage = `${aiResponse}\n\n✅ ${patient.name} admitted to ${roomDisplay}${roomTypeInfo}! You can see the task in the 3D map.`;
                  const aiMessageData = await saveMessage('assistant', successMessage);
                  const aiMessage = {
                    id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                    role: 'assistant',
                    content: successMessage,
                    created_at: new Date().toISOString()
                  };
                  setMessages(prev => [...prev, aiMessage]);
                  return; // Exit early - we handled it
                }
              }
            } catch (error) {
              console.error('❌ Fallback task creation failed:', error);
            }
          }
          
          // No explicit task command - try to detect from conversation context
          console.log('🔍 Attempting conversation-based task detection...');
          const conversationHistory = [
            ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user' as const, content: messageText },
            { role: 'assistant' as const, content: aiResponse }
          ];

          const detectedTask = detectTaskFromConversation(
            conversationHistory,
            contextData?.rooms?.map(r => r.id) || []
          );

          console.log('📊 Task detection result:', detectedTask);

          if (detectedTask && detectedTask.confidence >= 0.8) {
            // High confidence - create the task
            const taskConfig = TASK_CONFIGS[detectedTask.type];
            if (taskConfig) {
              try {
                // Validate and potentially reroute the target room
                let finalTargetRoomId = detectedTask.targetRoomId;
                let wasRerouted = false;
                
                // Check if the target room exists
                const { data: roomExists } = await supabase
                  .from('rooms')
                  .select('id')
                  .eq('id', detectedTask.targetRoomId)
                  .maybeSingle();
                
                // If room doesn't exist, use intelligent routing
                if (!roomExists) {
                  console.log(`⚠️ Room ${detectedTask.targetRoomId} not found, using intelligent routing...`);
                  const bestRoom = await findBestRoomForTask(detectedTask.type);
                  if (bestRoom) {
                    finalTargetRoomId = bestRoom;
                    wasRerouted = true;
                    console.log(`✅ Rerouted task to ${finalTargetRoomId}`);
                  }
                }
                
                await createTask({
                  type: detectedTask.type,
                  title: `${taskConfig.icon} ${detectedTask.type.replace(/_/g, ' ')}`,
                  description: `Task auto-detected from conversation`,
                  targetRoomId: finalTargetRoomId,
                  sourceRoomId: detectedTask.sourceRoomId,
                  status: 'pending',
                  priority: detectedTask.priority,
                  estimatedDuration: taskConfig.defaultDuration,
                });

                // Handle patient discharge
                if (detectedTask.type === 'patient_discharge') {
                  try {
                    const patient = await dischargePatient(finalTargetRoomId);
                    
                    if (patient) {
                      // Get room details for feedback
                      const { data: roomData } = await supabase
                        .from('rooms')
                        .select('room_name, room_number, room_type')
                        .eq('id', finalTargetRoomId)
                        .maybeSingle();
                      
                      const roomDisplay = roomData?.room_name || roomData?.room_number || finalTargetRoomId;
                      
                      console.log(`✅ ${patient.name} discharged from ${roomDisplay}`);
                      toast.success(`✅ ${patient.name} discharged from ${roomDisplay}`);
                      
                      // Refresh room details if we're viewing this room
                      if (roomId === finalTargetRoomId) {
                        setRoomDetails(null);
                      }
                    }
                  } catch (error) {
                    console.error('Error in patient discharge:', error);
                    toast.error('Failed to discharge patient');
                  }
                }

                // Handle patient onboarding - create patient record and room assignment
                if (detectedTask.type === 'patient_onboarding') {
                  try {
                    // Extract patient info from conversation
                    const conversationText = conversationHistory.map(m => m.content).join(' ');
                    const patientInfo = extractPatientInfo(conversationText);
                    console.log('Extracted patient info from detected conversation:', patientInfo);
                    
                    // Find best room based on patient condition
                    const roomSelection = await findBestRoomForPatient(patientInfo);
                    if (roomSelection) {
                      finalTargetRoomId = roomSelection.roomId;
                    }
                    
                    // Create patient record
                    const patient = await createPatient(patientInfo);
                    
                    if (patient) {
                      // Create room assignment
                      await createRoomAssignment(finalTargetRoomId, patient.id);
                      
                      // Update room status
                      await supabase
                        .from('rooms')
                        .update({ status: 'occupied' })
                        .eq('id', finalTargetRoomId);
                      
                      // Get room details for feedback
                      const { data: roomData } = await supabase
                        .from('rooms')
                        .select('room_name, room_number, room_type')
                        .eq('id', finalTargetRoomId)
                        .maybeSingle();
                      
                      const roomDisplay = roomData?.room_name || roomData?.room_number || finalTargetRoomId;
                      const roomTypeInfo = roomData?.room_type ? ` (${roomData.room_type})` : '';
                      
                      console.log(`✅ Patient ${patient.name} admitted to ${roomDisplay}`);
                      toast.success(`✅ ${patient.name} admitted to ${roomDisplay}${roomTypeInfo}`);
                      
                      // Trigger data refresh in parent to update UI
                      console.log('🔄 [REFRESH] Triggering parent data refresh...');
                      onDataUpdate?.();
                    } else {
                      // Even if patient creation fails, continue with task
                      console.log('⚠️ Continuing without patient record');
                      await supabase
                        .from('rooms')
                        .update({ status: 'occupied' })
                        .eq('id', finalTargetRoomId);
                    }
                  } catch (error) {
                    console.error('Error in patient onboarding:', error);
                    // Don't fail the whole task - just log and continue
                  }
                }

                console.log('Task auto-created successfully');

                // Add success indicator to message
                const rerouteNote = wasRerouted ? ` (routed to ${finalTargetRoomId})` : '';
                const finalMessage = `${aiResponse}\n\n✅ Task created!${rerouteNote} You can see it visualized in the 3D map.`;

                const aiMessageData = await saveMessage('assistant', finalMessage);
                const aiMessage = {
                  id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                  role: 'assistant',
                  content: finalMessage,
                  created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMessage]);
              } catch (taskError) {
                console.error('Error auto-creating task:', taskError);
                // Display without task creation
                const aiMessageData = await saveMessage('assistant', aiResponse);
                const aiMessage = {
                  id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                  role: 'assistant',
                  content: aiResponse,
                  created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMessage]);
              }
            } else {
              // No task config found, display normally
              const aiMessageData = await saveMessage('assistant', aiResponse);
              const aiMessage = {
                id: aiMessageData?.id || `temp-ai-${Date.now()}`,
                role: 'assistant',
                content: aiResponse,
                created_at: new Date().toISOString()
              };
              setMessages(prev => [...prev, aiMessage]);
            }
          } else {
            // Low confidence or no task detected - just display AI response normally
            const aiMessageData = await saveMessage('assistant', aiResponse);
            const aiMessage = {
              id: aiMessageData?.id || `temp-ai-${Date.now()}`,
              role: 'assistant',
              content: aiResponse,
              created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMessage]);
          }
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || 'Failed to process message');

      // Add error message to UI with more details for debugging
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error processing your request: ${error.message || 'Unknown error'}. Please try again.`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSend(prompt);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Quick Prompts - Always Visible */}
      <div className="flex-shrink-0 p-3 pb-0">
        <div className="rounded-lg p-2.5 border" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-light))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'hsl(var(--accent-green))' }} />
            <p className="text-[10px] font-medium" style={{ color: 'hsl(var(--text-gray))' }}>
              {roomId ? `Quick Actions for ${roomName}` : 'Quick Actions'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isGeneratingPrompts ? (
              <div className="flex items-center gap-2 w-full justify-center py-1">
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'hsl(var(--accent-green))' }} />
                <span className="text-[10px]" style={{ color: 'hsl(var(--text-gray))' }}>Generating suggestions...</span>
              </div>
            ) : (
              quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-[11px] rounded-full transition-all border hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'hsl(var(--bg-white))',
                    color: 'hsl(var(--text-dark))',
                    borderColor: 'hsl(var(--border-light))'
                  }}
                >
                  {prompt}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Intro Message - Only when no messages */}
        {messages.length === 0 && (
          <div className="rounded-lg p-3 border" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', borderColor: 'hsl(var(--border-light))' }}>
            <p className="text-xs text-center" style={{ color: 'hsl(var(--text-gray))' }}>
              👋 I monitor your ward's equipment and room readiness. Ask me what matters right now!
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2.5 ${
                message.role === 'user'
                  ? 'border border-white/20'
                  : 'border border-border-light'
              }`}
              style={{
                backgroundColor: message.role === 'user'
                  ? 'hsl(var(--bg-user-msg))'
                  : 'hsl(var(--bg-ai-msg))'
              }}
            >
              <div className="text-xs whitespace-pre-wrap" style={{ color: message.role === 'user' ? 'hsl(var(--text-white))' : 'hsl(var(--text-dark))' }}>
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-2.5 border border-border-light" style={{ backgroundColor: 'hsl(var(--bg-ai-msg))' }}>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'hsl(var(--accent-green))' }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-gray))' }}>Vitalis is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-3">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border-2" style={{
          backgroundColor: 'hsl(var(--bg-tertiary))',
          borderColor: 'hsl(var(--accent-green))'
        }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-1 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
            style={{
              color: 'hsl(var(--text-dark))'
            }}
          />
          <Button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="h-7 w-7 p-0 rounded-full flex-shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: 'hsl(var(--accent-green))',
              color: 'hsl(var(--text-white))'
            }}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
