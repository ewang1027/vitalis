import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { RoomDetail } from '@/data/mockRoomDetails';
import { Button } from '@/components/ui/button';
import { X, Info } from 'lucide-react';
import * as THREE from 'three';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RoomDetailViewProps {
  room: RoomDetail;
  onExit: () => void;
}

interface EquipmentProps {
  equipment: RoomDetail['equipment'][0];
  onClick: () => void;
}

function Equipment({ equipment, onClick }: EquipmentProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  // Different colors and shapes for different equipment types
  const getEquipmentVisuals = () => {
    switch (equipment.type) {
      case 'bed':
        return {
          geometry: <boxGeometry args={[2, 0.5, 1]} />,
          color: hovered ? '#60a5fa' : '#3b82f6',
          scale: 1,
        };
      case 'monitor':
        return {
          geometry: <boxGeometry args={[0.4, 0.6, 0.1]} />,
          color: hovered ? '#34d399' : '#10b981',
          scale: 1,
        };
      case 'iv_pump':
        return {
          geometry: <boxGeometry args={[0.3, 0.8, 0.3]} />,
          color: hovered ? '#fbbf24' : '#f59e0b',
          scale: 1,
        };
      case 'wheelchair':
        return {
          geometry: <boxGeometry args={[0.6, 0.8, 0.6]} />,
          color: hovered ? '#a78bfa' : '#8b5cf6',
          scale: 1,
        };
      case 'oxygen_tank':
        return {
          geometry: <cylinderGeometry args={[0.15, 0.15, 1.2, 16]} />,
          color: hovered ? '#f472b6' : '#ec4899',
          scale: 1,
        };
      default:
        return {
          geometry: <boxGeometry args={[0.5, 0.5, 0.5]} />,
          color: hovered ? '#9ca3af' : '#6b7280',
          scale: 1,
        };
    }
  };

  const visuals = getEquipmentVisuals();

  return (
    <group position={[equipment.position.x, equipment.position.y, equipment.position.z]}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {visuals.geometry}
        <meshStandardMaterial
          color={visuals.color}
          emissive={hovered ? visuals.color : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      {hovered && (
        <Text
          position={[0, equipment.type === 'bed' ? 1 : 1.2, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {equipment.name}
        </Text>
      )}
      {/* Status indicator */}
      <mesh position={[0, equipment.type === 'bed' ? 0.8 : 1.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={
            equipment.status === 'active'
              ? '#22c55e'
              : equipment.status === 'idle'
              ? '#eab308'
              : '#ef4444'
          }
        />
      </mesh>
    </group>
  );
}

function Room({ room }: { room: RoomDetail }) {
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
        {room.roomName}
      </Text>

      {/* Patient name on back wall if patient exists */}
      {room.patient && (
        <Text
          position={[0, 3, -4.9]}
          fontSize={0.25}
          color="#4b5563"
          anchorX="center"
          anchorY="middle"
        >
          Patient: {room.patient.name}
        </Text>
      )}
    </group>
  );
}

export function RoomDetailView({ room, onExit }: RoomDetailViewProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<RoomDetail['equipment'][0] | null>(
    null
  );

  return (
    <div className="relative w-full h-full bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-b p-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{room.roomName} - 3D View</h2>
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
        <Room room={room} />

        {/* Equipment */}
        {room.equipment.map((item) => (
          <Equipment
            key={item.id}
            equipment={item}
            onClick={() => setSelectedEquipment(item)}
          />
        ))}
      </Canvas>

      {/* Equipment Info Panel */}
      {selectedEquipment && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:w-96 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
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
              <span className="font-medium">{selectedEquipment.type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${
                  selectedEquipment.status === 'active'
                    ? 'text-green-600'
                    : selectedEquipment.status === 'idle'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {selectedEquipment.status.charAt(0).toUpperCase() +
                  selectedEquipment.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position:</span>
              <span className="font-medium text-xs">
                X: {selectedEquipment.position.x.toFixed(1)}, Y:{' '}
                {selectedEquipment.position.y.toFixed(1)}, Z:{' '}
                {selectedEquipment.position.z.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Display (if patient exists) */}
      {room.vitals && room.patient && (
        <div className="absolute top-20 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg w-64">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Live Vitals - {room.patient.name}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Heart Rate:</span>
              <span className="font-medium">{room.vitals.heartRate} bpm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BP:</span>
              <span className="font-medium">{room.vitals.bloodPressure}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">O2 Sat:</span>
              <span className="font-medium">{room.vitals.oxygenSaturation}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temp:</span>
              <span className="font-medium">{room.vitals.temperature}°F</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">Controls:</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>• Left click + drag: Rotate view</li>
          <li>• Right click + drag: Pan view</li>
          <li>• Scroll: Zoom in/out</li>
          <li>• Click equipment: View details</li>
        </ul>
      </div>
    </div>
  );
}
