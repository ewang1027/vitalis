import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { X, Info, Thermometer, Droplets, Battery, Wifi, WifiOff } from 'lucide-react';
import * as THREE from 'three';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HospitalBed } from '@/components/3d/HospitalBed';
import { OxygenTank } from '@/components/3d/OxygenTank';
import { IVPump } from '@/components/3d/IVPump';
import { MedicalMonitor } from '@/components/3d/MedicalMonitor';
import { Wheelchair } from '@/components/3d/Wheelchair';
import { useESP32Data } from '@/hooks/useESP32Data';
import { useRealtimeVitals } from '@/hooks/useRealtimeVitals';
import { Badge } from '@/components/ui/badge';

// Type for room details from useRoomDetails hook
interface RoomDetailViewProps {
  room: {
    room: Record<string, unknown>;
    patient: Record<string, unknown> | null;
    doctor: Record<string, unknown> | null;
    nurse: Record<string, unknown> | null;
    vitals: Record<string, unknown> | null;
    equipment: Record<string, unknown>[];
    alerts: Record<string, unknown>[];
  };
  onExit: () => void;
}

interface EquipmentProps {
  equipment: {
    id: string;
    name: string;
    equipment_type: string;
    state: string;
    position_x: number | null;
    position_y: number | null;
    position_z: number | null;
  };
  onClick: () => void;
}

function Equipment({ equipment, onClick }: EquipmentProps) {
  const [hovered, setHovered] = useState(false);

  const position: [number, number, number] = [
    equipment.position_x ?? 0,
    equipment.position_y ?? 0,
    equipment.position_z ?? 0
  ];

  const equipmentType = equipment.equipment_type.toLowerCase();

  // Render detailed 3D component based on equipment type
  const renderEquipmentModel = () => {
    const handleClick = () => {
      onClick();
    };

    switch (equipmentType) {
      case 'bed':
        return (
          <HospitalBed
            position={position}
            onClick={handleClick}
            hovered={hovered}
          />
        );
      case 'oxygen_tank':
        return (
          <OxygenTank
            position={position}
            onClick={handleClick}
            hovered={hovered}
          />
        );
      case 'iv_pump':
        return (
          <IVPump
            position={position}
            onClick={handleClick}
            hovered={hovered}
          />
        );
      case 'monitor':
        return (
          <MedicalMonitor
            position={position}
            onClick={handleClick}
            hovered={hovered}
          />
        );
      case 'wheelchair':
        return (
          <Wheelchair
            position={position}
            onClick={handleClick}
            hovered={hovered}
          />
        );
      default:
        // Fallback to simple box for unknown equipment types
        return (
          <group position={position}>
            <mesh onClick={handleClick}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial
                color={hovered ? '#9ca3af' : '#6b7280'}
                emissive={hovered ? '#9ca3af' : '#000000'}
                emissiveIntensity={hovered ? 0.3 : 0}
              />
            </mesh>
          </group>
        );
    }
  };

  return (
    <group
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {renderEquipmentModel()}

      {/* Equipment name label when hovered */}
      {hovered && (
        <Text
          position={[
            position[0],
            position[1] + (equipmentType === 'bed' ? 1.2 : equipmentType === 'iv_pump' ? 2.2 : 1.5),
            position[2]
          ]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {equipment.name}
        </Text>
      )}

      {/* Status indicator */}
      <mesh position={[
        position[0],
        position[1] + (equipmentType === 'bed' ? 1.0 : equipmentType === 'iv_pump' ? 2.0 : 1.3),
        position[2]
      ]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={
            equipment.state === 'in_use'
              ? '#22c55e'
              : equipment.state === 'idle_ready'
              ? '#eab308'
              : '#ef4444'
          }
        />
      </mesh>
    </group>
  );
}

function Room({ roomData }: { roomData: Record<string, unknown> }) {
  const wallColor = '#e5e7eb';
  const floorColor = '#f3f4f6';

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-5, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[5, 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Room Name on back wall */}
      <Text
        position={[0, 3.5, -4.9]}
        fontSize={0.5}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
      >
        {roomData.room?.room_name || roomData.room?.room_number || 'Room'}
      </Text>

      {/* Patient name on back wall if patient exists */}
      {roomData.patient && (
        <Text
          position={[0, 3, -4.9]}
          fontSize={0.25}
          color="#4b5563"
          anchorX="center"
          anchorY="middle"
        >
          Patient: {roomData.patient.name}
        </Text>
      )}
    </group>
  );
}

export function RoomDetailView({ room, onExit }: RoomDetailViewProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, unknown> | null>(null);
  const { data: esp32Data, isConnected: esp32Connected } = useESP32Data();

  // Get patient ID and severity for real-time vitals
  const patientId = room.patient?.id as string | undefined;
  const patientIds = useMemo(() => patientId ? [patientId] : [], [patientId]);
  const patientSeverities = useMemo(() => {
    const map = new Map<string, string | null>();
    if (patientId && room.patient?.severity) {
      map.set(patientId, room.patient.severity as string);
    }
    return map;
  }, [patientId, room.patient?.severity]);

  // Use the same real-time vitals hook as the sidebar
  const { vitalsData, loading: vitalsLoading } = useRealtimeVitals({
    patientIds,
    patientSeverities,
    updateInterval: 3000,
    enableSimulation: true,
  });

  // Get vitals for this patient - memoize to ensure stable reference
  const liveVitals = useMemo(() => {
    if (!patientId) return null;
    const vitals = vitalsData.get(patientId);
    // Create a new object to force re-render when data changes
    return vitals ? { ...vitals } : null;
  }, [patientId, vitalsData]);

  // Debug: log vitals updates
  useEffect(() => {
    if (liveVitals) {
      console.log('RoomDetailView - Vitals updated:', liveVitals);
    }
  }, [liveVitals]);

  return (
    <div className="relative w-full h-full bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-b p-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">
              {room.room?.room_name || room.room?.room_number || 'Room'} - 3D View
            </h2>
            <p className="text-xs text-muted-foreground">
              Click equipment • Drag to rotate
            </p>
          </div>
          <Button onClick={onExit} variant="outline" size="sm">
            <X className="mr-1 h-3 w-3" />
            Exit
          </Button>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows className="h-full w-full">
        <PerspectiveCamera makeDefault position={[0, 1.6, 4]} fov={75} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2}
          target={[0, 1, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[0, 3, 0]} intensity={0.5} />
        <pointLight position={[-3, 2, -3]} intensity={0.3} />
        <pointLight position={[3, 2, -3]} intensity={0.3} />

        {/* Room Structure */}
        <Room roomData={room} />

        {/* Equipment */}
        {room.equipment?.map((item: Record<string, unknown>) => (
          <Equipment
            key={item.id}
            equipment={item}
            onClick={() => setSelectedEquipment(item)}
          />
        ))}
      </Canvas>

      {/* Equipment Info Panel */}
      {selectedEquipment && (
        <div className="absolute bottom-32 left-4 right-4 md:left-auto md:w-96 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              <h3 className="font-semibold">{selectedEquipment.name}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEquipment(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{selectedEquipment.equipment_type?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${
                  selectedEquipment.state === 'in_use'
                    ? 'text-green-600'
                    : selectedEquipment.state === 'idle_ready'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {selectedEquipment.state?.charAt(0).toUpperCase() +
                  selectedEquipment.state?.slice(1).replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position:</span>
              <span className="font-medium text-xs">
                X: {(selectedEquipment.position_x ?? 0).toFixed(1)}, Y:{' '}
                {(selectedEquipment.position_y ?? 0).toFixed(1)}, Z:{' '}
                {(selectedEquipment.position_z ?? 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Vitals Monitor - Real-time data */}
      {liveVitals && room.patient && (
        <div className="absolute bottom-24 left-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-red-500" />
              Patient Vitals
            </h3>
            <Badge 
              variant="default" 
              className={`${liveVitals.dataSource === 'webhook' ? 'bg-green-500' : 'bg-blue-500'} text-white flex items-center gap-1 px-2 py-0`}
            >
              <Wifi className="h-3 w-3" />
              {liveVitals.dataSource === 'webhook' ? 'Live' : 'Sim'}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Heart Rate:</span>
              <span className="font-medium text-red-600">
                {liveVitals.heartRate ? `${liveVitals.heartRate} bpm` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Blood Pressure:</span>
              <span className="font-medium">
                {liveVitals.bloodPressure || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">O2 Saturation:</span>
              <span className="font-medium text-blue-600">
                {liveVitals.oxygenSaturation ? `${liveVitals.oxygenSaturation}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Temperature:</span>
              <span className="font-medium">
                {liveVitals.temperature ? `${liveVitals.temperature}°F` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Room Environmental Sensors (ESP32) */}
      <div className="absolute top-20 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg w-64">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Room Environment
          </h3>
          {esp32Connected ? (
            <Badge variant="default" className="bg-green-500 text-white flex items-center gap-1 px-2 py-0">
              <Wifi className="h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Temperature:</span>
            <span className="font-medium text-orange-600">
              {esp32Data?.temperature ? `${esp32Data.temperature.toFixed(1)}°C` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Humidity:</span>
            <span className="font-medium text-blue-600">
              {esp32Data?.humidity ? `${esp32Data.humidity.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Motion Detected:</span>
            <span className={`font-medium ${esp32Data?.motion ? 'text-red-600' : 'text-green-600'}`}>
              {esp32Data?.motion !== undefined ? (esp32Data.motion ? 'Yes' : 'No') : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Light Level:</span>
            <span className="font-medium">
              {esp32Data?.light !== undefined ? `${esp32Data.light.toFixed(0)}` : 'N/A'}
            </span>
          </div>
          {esp32Data?.customSensors?.distance !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-medium text-purple-600">
                {`${esp32Data.customSensors.distance.toFixed(1)} cm`}
              </span>
            </div>
          )}
        </div>
        {esp32Data?.deviceId && (
          <div className="text-xs text-muted-foreground pt-2 mt-2 border-t">
            Device: {esp32Data.deviceId.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
