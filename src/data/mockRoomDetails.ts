export interface RoomDetail {
  roomId: string;
  roomName: string;
  roomType: string;
  status: 'occupied' | 'available' | 'cleaning' | 'maintenance';
  patient?: {
    id: string;
    name: string;
    age: number;
    gender: string;
    admissionDate: Date;
    condition: string;
    severity: 'stable' | 'moderate' | 'critical';
  };
  doctor?: {
    id: string;
    name: string;
    specialty: string;
    phone: string;
  };
  nurse?: {
    id: string;
    name: string;
    shift: string;
  };
  vitals?: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    oxygenSaturation: number;
    respiratoryRate: number;
    lastUpdated: Date;
  };
  equipment: Array<{
    id: string;
    name: string;
    type: string;
    status: 'active' | 'idle' | 'offline';
    position: { x: number; y: number; z: number };
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

export const mockRoomDetails: Record<string, RoomDetail> = {
  'room-101': {
    roomId: 'room-101',
    roomName: 'Room 101',
    roomType: 'ICU',
    status: 'occupied',
    patient: {
      id: 'patient-001',
      name: 'Sarah Johnson',
      age: 45,
      gender: 'Female',
      admissionDate: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      condition: 'Post-operative recovery',
      severity: 'moderate',
    },
    doctor: {
      id: 'doctor-001',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiothoracic Surgery',
      phone: '(555) 123-4567',
    },
    nurse: {
      id: 'nurse-001',
      name: 'Emily Rodriguez',
      shift: 'Day Shift (7AM-7PM)',
    },
    vitals: {
      heartRate: 78,
      bloodPressure: '120/80',
      temperature: 98.6,
      oxygenSaturation: 97,
      respiratoryRate: 16,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
    equipment: [
      {
        id: 'bed-101',
        name: 'Hospital Bed',
        type: 'bed',
        status: 'active',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: 'monitor-101',
        name: 'Vital Signs Monitor',
        type: 'monitor',
        status: 'active',
        position: { x: 2, y: 1, z: 0 },
      },
      {
        id: 'iv-pump-101',
        name: 'IV Pump',
        type: 'iv_pump',
        status: 'active',
        position: { x: 1.5, y: 1, z: 0.5 },
      },
      {
        id: 'wheelchair-101',
        name: 'Wheelchair',
        type: 'wheelchair',
        status: 'idle',
        position: { x: -2, y: 0, z: -1 },
      },
    ],
    alerts: [
      {
        id: 'alert-001',
        type: 'info',
        message: 'Medication due in 30 minutes',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
      },
    ],
  },
  'room-102': {
    roomId: 'room-102',
    roomName: 'Room 102',
    roomType: 'General Ward',
    status: 'occupied',
    patient: {
      id: 'patient-002',
      name: 'James Miller',
      age: 62,
      gender: 'Male',
      admissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      condition: 'Pneumonia treatment',
      severity: 'stable',
    },
    doctor: {
      id: 'doctor-002',
      name: 'Dr. Lisa Thompson',
      specialty: 'Internal Medicine',
      phone: '(555) 234-5678',
    },
    nurse: {
      id: 'nurse-002',
      name: 'Carlos Martinez',
      shift: 'Night Shift (7PM-7AM)',
    },
    vitals: {
      heartRate: 72,
      bloodPressure: '118/76',
      temperature: 99.2,
      oxygenSaturation: 95,
      respiratoryRate: 18,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 3),
    },
    equipment: [
      {
        id: 'bed-102',
        name: 'Hospital Bed',
        type: 'bed',
        status: 'active',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: 'monitor-102',
        name: 'Vital Signs Monitor',
        type: 'monitor',
        status: 'active',
        position: { x: 2, y: 1, z: 0 },
      },
      {
        id: 'oxygen-tank-102',
        name: 'Oxygen Tank',
        type: 'oxygen_tank',
        status: 'active',
        position: { x: -1.5, y: 0, z: 0.5 },
      },
    ],
    alerts: [],
  },
  'room-103': {
    roomId: 'room-103',
    roomName: 'Room 103',
    roomType: 'General Ward',
    status: 'available',
    equipment: [
      {
        id: 'bed-103',
        name: 'Hospital Bed',
        type: 'bed',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    alerts: [
      {
        id: 'alert-103',
        type: 'info',
        message: 'Room ready for next patient',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
    ],
  },
};
