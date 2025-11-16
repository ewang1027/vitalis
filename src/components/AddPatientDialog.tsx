import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Loader2, UserPlus, Stethoscope, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/lib/supabase';

type Staff = Database['public']['Tables']['staff']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientAdded?: () => void;
}

export function AddPatientDialog({ open, onOpenChange, onPatientAdded }: AddPatientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    condition: '',
    severity: 'stable',
    assignedDoctorId: 'none',
    assignedRoomId: 'none',
  });

  const fetchDoctorsAndRooms = async () => {
    setLoadingData(true);
    try {
      // Fetch doctors (staff with role 'Doctor')
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('role', 'Doctor')
        .order('name', { ascending: true });

      if (staffError) throw staffError;
      setDoctors(staffData || []);

      // Fetch available rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);
    } catch (error) {
      console.error('Error fetching doctors and rooms:', error);
      toast({
        title: 'Warning',
        description: 'Could not load doctors and rooms. You can still add the patient.',
        variant: 'default',
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch doctors and rooms when dialog opens
  useEffect(() => {
    if (open) {
      fetchDoctorsAndRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.age || !formData.gender) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in patient name, age, and gender.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Insert patient
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          condition: formData.condition || null,
          severity: formData.severity,
          admission_date: new Date().toISOString(),
          is_active: true,
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      // If room is assigned, create room assignment
      if (formData.assignedRoomId && formData.assignedRoomId !== 'none' && patientData) {
        const { error: assignmentError } = await supabase
          .from('room_assignments')
          .insert([{
            patient_id: patientData.id,
            room_id: formData.assignedRoomId,
            assigned_doctor_id: formData.assignedDoctorId !== 'none' ? formData.assignedDoctorId : null,
            assigned_at: new Date().toISOString(),
            is_active: true,
          }]);

        if (assignmentError) {
          console.error('Error creating room assignment:', assignmentError);
          // Don't fail the whole operation, just warn
          toast({
            title: 'Patient Added',
            description: `${formData.name} was added but room assignment failed.`,
            variant: 'default',
          });
        } else {
          const roomName = rooms.find(r => r.id === formData.assignedRoomId)?.room_number;
          const doctorName = doctors.find(d => d.id === formData.assignedDoctorId)?.name;
          
          toast({
            title: 'Patient Added Successfully',
            description: `${formData.name} has been admitted${roomName ? ` to ${roomName}` : ''}${doctorName ? ` with Dr. ${doctorName}` : ''}.`,
          });
        }
      } else {
        toast({
          title: 'Patient Added Successfully',
          description: `${formData.name} has been admitted to the ward.`,
        });
      }

      // Reset form
      setFormData({
        name: '',
        age: '',
        gender: '',
        condition: '',
        severity: 'stable',
        assignedDoctorId: 'none',
        assignedRoomId: 'none',
      });

      // Close dialog first
      onOpenChange(false);
      
      // Then trigger refetch after a short delay to allow dialog to close
      setTimeout(() => {
        onPatientAdded?.();
      }, 100);
    } catch (error) {
      console.error('Error adding patient:', error);
      toast({
        title: 'Error Adding Patient',
        description: error instanceof Error ? error.message : 'Failed to add patient. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Patient
          </DialogTitle>
          <DialogDescription>
            Enter patient information to admit them to the ward.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Patient Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Patient Name <span className="text-accent-red">*</span>
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            {/* Age and Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="age">
                  Age <span className="text-accent-red">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="65"
                  min="0"
                  max="120"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">
                  Gender <span className="text-accent-red">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                  required
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Condition */}
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition / Diagnosis</Label>
              <Input
                id="condition"
                placeholder="e.g., Post-operative recovery, Pneumonia"
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
              />
            </div>

            {/* Severity */}
            <div className="grid gap-2">
              <Label htmlFor="severity">Severity Level</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => handleChange('severity', value)}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Section */}
            <div className="border-t border-border pt-4 mt-2">
              <h4 className="text-sm font-semibold text-text-dark mb-3">Room Assignment (Optional)</h4>
              
              {/* Room Assignment */}
              <div className="grid gap-2 mb-3">
                <Label htmlFor="room" className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-text-gray" />
                  Assign to Room
                </Label>
                <Select
                  value={formData.assignedRoomId}
                  onValueChange={(value) => handleChange('assignedRoomId', value)}
                  disabled={loadingData}
                >
                  <SelectTrigger id="room">
                    <SelectValue placeholder={loadingData ? "Loading rooms..." : "Select room"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No room assigned</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} - {room.room_name} ({room.room_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Assignment */}
              <div className="grid gap-2">
                <Label htmlFor="doctor" className="flex items-center gap-2">
                  <Stethoscope className="h-3.5 w-3.5 text-text-gray" />
                  Assign Doctor
                </Label>
                <Select
                  value={formData.assignedDoctorId}
                  onValueChange={(value) => handleChange('assignedDoctorId', value)}
                  disabled={loadingData}
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder={loadingData ? "Loading doctors..." : "Select doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No doctor assigned</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name}{doctor.specialty ? ` - ${doctor.specialty}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Admission Date (auto-filled) */}
            <div className="grid gap-2 pt-2 border-t border-border">
              <Label htmlFor="admission-date">Admission Date</Label>
              <Input
                id="admission-date"
                type="text"
                value={new Date().toLocaleDateString()}
                disabled
                className="bg-bg-tertiary/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Patient
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

