import React, { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Database } from '@/lib/supabase';
import type { Asset } from '@/types/wardops';
import { useTaskSubscription } from '@/hooks/useTaskSubscription';
import { TaskPaths } from './TaskPathAnimation';
import { RoomTaskIndicators } from './RoomTaskIndicator';
import { RoomInfoPopup } from './RoomInfoPopup';
import { supabase } from '@/lib/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];

interface Hospital3DMapProps {
  rooms: Room[];
  equipment: Asset[];
  onRoomSelect: (roomId: string) => void;
  selectedRoomId: string | null;
  onEnterRoom?: (roomId: string) => void;
  onCloseRoomPopup?: () => void;
}

// Simple Room Component - just a box
function SimpleRoom({
  position,
  label,
  status,
  roomId,
  isSelected,
  onClick,
  labelRotation = 0,
}: {
  position: [number, number, number];
  label: string;
  status: 'ready' | 'needs-attention' | 'occupied';
  roomId: string;
  isSelected: boolean;
  onClick: () => void;
  labelRotation?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      const targetY = isSelected ? 0.5 : hovered ? 0.3 : 0;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }

    // Make text always face camera
    if (textRef.current) {
      textRef.current.quaternion.copy(camera.quaternion);
    }
  });

  const getColor = () => {
    switch (status) {
      case 'ready': return '#22c55e'; // Green for available
      case 'needs-attention': return '#ef4444'; // Red for needs attention
      case 'occupied': return '#eab308'; // Yellow for occupied
      default: return '#6b7280';
    }
  };

  return (
    <group position={position}>
      {/* Room box - colored by status */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[3, 2, 3]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.25 : 0.15}
          roughness={0.6}
        />
      </mesh>

      {/* Room label - always faces camera */}
      <Text
        ref={textRef}
        position={[0, 2, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// Floor section
function FloorSection({
  position,
  size
}: {
  position: [number, number, number];
  size: [number, number];
}) {
  return (
    <mesh position={position} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#d1d5db" roughness={0.8} />
    </mesh>
  );
}

// Perimeter wall
function PerimeterWall({
  position,
  width,
  height = 3,
  rotation = 0,
  label
}: {
  position: [number, number, number];
  width: number;
  height?: number;
  rotation?: number;
  label?: string;
}) {
  const textRef = useRef<any>(null);
  const { camera } = useThree();

  useFrame(() => {
    // Make label always face camera
    if (textRef.current) {
      textRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group>
      <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.8} />
      </mesh>
      {label && (
        <Text
          ref={textRef}
          position={[position[0], position[1] + height / 2 + 0.3, position[2]]}
          fontSize={0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

// Central Command Station
function CentralCommandStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 0.1, 8]} />
        <meshStandardMaterial color="#374151" roughness={0.3} />
      </mesh>

      {/* Main console */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 1, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} />
      </mesh>

      {/* Console top surface */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[2.6, 2.6, 0.1, 8]} />
        <meshStandardMaterial color="#111827" roughness={0.3} />
      </mesh>

      {/* Holographic display column */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 2, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Display screen ring */}
      <mesh position={[0, 3, 0]}>
        <torusGeometry args={[1.8, 0.15, 16, 32]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#60a5fa"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, 3.8, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        COMMAND CENTER
      </Text>
    </group>
  );
}

// Camera controller to focus on selected room
function CameraController({
  targetPosition,
  enabled
}: {
  targetPosition: [number, number, number] | null;
  enabled: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>();
  const [isResetting, setIsResetting] = useState(false);
  
  // Default overview camera position
  const defaultCameraPosition = new THREE.Vector3(38, 18, -11);
  const defaultTargetPosition = new THREE.Vector3(0, 0, 0);

  // Track when enabled changes from true to false to trigger reset
  const prevEnabledRef = useRef(enabled);
  
  useEffect(() => {
    if (prevEnabledRef.current === true && enabled === false) {
      // Room was just deselected, trigger reset
      setIsResetting(true);
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  useFrame(() => {
    if (enabled && targetPosition && controlsRef.current) {
      // Calculate camera position - offset from room
      const offsetDistance = 15;
      const targetCamera = new THREE.Vector3(
        targetPosition[0] + offsetDistance,
        targetPosition[1] + 10,
        targetPosition[2] + offsetDistance
      );

      // Smoothly move camera
      camera.position.lerp(targetCamera, 0.05);

      // Update controls target to look at the room
      const target = new THREE.Vector3(...targetPosition);
      controlsRef.current.target.lerp(target, 0.05);
      controlsRef.current.update();
      
      // Clear resetting flag
      setIsResetting(false);
    } else if (isResetting && controlsRef.current) {
      // Reset camera to overview position
      camera.position.lerp(defaultCameraPosition, 0.05);
      controlsRef.current.target.lerp(defaultTargetPosition, 0.05);
      controlsRef.current.update();
      
      // Check if we're close enough to default position to stop resetting
      const distanceToDefault = camera.position.distanceTo(defaultCameraPosition);
      if (distanceToDefault < 0.5) {
        setIsResetting(false);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={150}
      enablePan={true}
      maxPolarAngle={Math.PI} // Allow full vertical rotation
      minPolarAngle={0}
    />
  );
}

// Clean hallway corridor with defined edges
function Hallway({
  start,
  end,
  width = 4
}: {
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
}) {
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)
  );

  // Calculate rotation based on direction
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0]);

  return (
    <group position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
      {/* Main corridor floor - darker than base floor */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial 
          color="#374151" 
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Center stripe for direction guidance */}
      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, 0.3]} />
        <meshStandardMaterial 
          color="#4b5563" 
          roughness={0.8}
        />
      </mesh>

      {/* Edge lines - left */}
      <mesh position={[0, -0.06, -width / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, 0.1]} />
        <meshStandardMaterial 
          color="#6b7280" 
          roughness={0.5}
        />
      </mesh>

      {/* Edge lines - right */}
      <mesh position={[0, -0.06, width / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, 0.1]} />
        <meshStandardMaterial 
          color="#6b7280" 
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

// Hallway intersection piece
function HallwayIntersection({ position, size = 4 }: { position: [number, number, number]; size?: number }) {
  return (
    <group position={position}>
      {/* Intersection floor */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial 
          color="#374151" 
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {/* Center marker */}
      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial 
          color="#4b5563" 
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

// Hospital layout with rectangular perimeter and cross-hallways
function createHospitalLayout(rooms: Room[]): {
  roomLayouts: Map<string, {
    id: string;
    label: string;
    position: [number, number, number];
    labelRotation: number;
  }>;
  hallways: Array<{ start: [number, number, number]; end: [number, number, number] }>;
  floorSections: Array<{ position: [number, number, number]; size: [number, number] }>;
  walls: Array<{ position: [number, number, number]; width: number; rotation: number; label: string }>;
  intersections: Array<{ position: [number, number, number] }>;
} {
  const roomLayouts = new Map();
  const hallways: Array<{ start: [number, number, number]; end: [number, number, number] }> = [];
  const floorSections: Array<{ position: [number, number, number]; size: [number, number] }> = [];
  const walls: Array<{ position: [number, number, number]; width: number; rotation: number; label: string }> = [];
  const intersections: Array<{ position: [number, number, number] }> = [];

  // Layout parameters
  const perimeterWidth = 50;
  const perimeterHeight = 40;
  const hallwayOffset = 5; // Distance from hallway centerline to room

  // Define 6 hallway segments: 4 perimeter + 2 cross-hallways
  const hallwaySegments = [
    // Perimeter hallways
    { name: "North", start: [-perimeterWidth / 2, 0.1, -perimeterHeight / 2], end: [perimeterWidth / 2, 0.1, -perimeterHeight / 2] },
    { name: "East", start: [perimeterWidth / 2, 0.1, -perimeterHeight / 2], end: [perimeterWidth / 2, 0.1, perimeterHeight / 2] },
    { name: "South", start: [perimeterWidth / 2, 0.1, perimeterHeight / 2], end: [-perimeterWidth / 2, 0.1, perimeterHeight / 2] },
    { name: "West", start: [-perimeterWidth / 2, 0.1, perimeterHeight / 2], end: [-perimeterWidth / 2, 0.1, -perimeterHeight / 2] },
    // Cross hallways
    { name: "Horizontal", start: [-perimeterWidth / 2, 0.1, 0], end: [perimeterWidth / 2, 0.1, 0] },
    { name: "Vertical", start: [0, 0.1, -perimeterHeight / 2], end: [0, 0.1, perimeterHeight / 2] },
  ];

  hallwaySegments.forEach(segment => {
    hallways.push({ start: segment.start as [number, number, number], end: segment.end as [number, number, number] });
  });

  // Floor section
  const floorWidth = 100;
  const floorDepth = 100;
  floorSections.push({
    position: [0, -0.1, 0],
    size: [floorWidth, floorDepth],
  });

  // Categorize rooms by type
  const specialtyRooms: Room[] = [];
  const nurseStations: Room[] = [];
  const equipmentRooms: Room[] = [];
  const patientRooms: Room[] = [];

  rooms.forEach(room => {
    const name = (room.room_name || room.room_number || '').toLowerCase();

    if (name.includes('mri') || name.includes('x-ray') || name.includes('xray') ||
        name.includes('ct') || name.includes('scan') || name.includes('imaging') ||
        name.includes('radiology')) {
      specialtyRooms.push(room);
    } else if (name.includes('nurse') || name.includes('station')) {
      nurseStations.push(room);
    } else if (name.includes('equipment') || name.includes('supply') || name.includes('storage')) {
      equipmentRooms.push(room);
    } else {
      patientRooms.push(room);
    }
  });

  // Place specialty rooms at corners
  const corners = [
    { pos: [-perimeterWidth / 2 + 3, 0, -perimeterHeight / 2 + 3], rot: -Math.PI * 3 / 4 }, // NW
    { pos: [perimeterWidth / 2 - 3, 0, -perimeterHeight / 2 + 3], rot: -Math.PI / 4 },      // NE
    { pos: [perimeterWidth / 2 - 3, 0, perimeterHeight / 2 - 3], rot: Math.PI / 4 },        // SE
    { pos: [-perimeterWidth / 2 + 3, 0, perimeterHeight / 2 - 3], rot: Math.PI * 3 / 4 },   // SW
  ];

  specialtyRooms.forEach((room, idx) => {
    if (idx < corners.length) {
      const corner = corners[idx];
      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number || `Room ${room.id}`,
        position: corner.pos as [number, number, number],
        labelRotation: corner.rot,
      });
    }
  });

  // Distribute nurse stations (1 per hallway)
  const nurseStationPositions = [
    { pos: [0, 0, -perimeterHeight / 2 - hallwayOffset], rot: 0 },           // North
    { pos: [perimeterWidth / 2 + hallwayOffset, 0, 0], rot: Math.PI / 2 },   // East
    { pos: [0, 0, perimeterHeight / 2 + hallwayOffset], rot: Math.PI },      // South
    { pos: [-perimeterWidth / 2 - hallwayOffset, 0, 0], rot: -Math.PI / 2 }, // West
    { pos: [-perimeterWidth / 4, 0, hallwayOffset], rot: Math.PI },          // Horizontal hallway
    { pos: [-hallwayOffset, 0, perimeterHeight / 4], rot: -Math.PI / 2 },    // Vertical hallway
  ];

  nurseStations.forEach((room, idx) => {
    if (idx < nurseStationPositions.length) {
      const pos = nurseStationPositions[idx];
      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number || `Room ${room.id}`,
        position: pos.pos as [number, number, number],
        labelRotation: pos.rot,
      });
    }
  });

  // Distribute equipment rooms (1 per hallway)
  const equipmentPositions = [
    { pos: [perimeterWidth / 4, 0, -perimeterHeight / 2 - hallwayOffset], rot: 0 },           // North
    { pos: [perimeterWidth / 2 + hallwayOffset, 0, perimeterHeight / 4], rot: Math.PI / 2 },  // East
    { pos: [-perimeterWidth / 4, 0, perimeterHeight / 2 + hallwayOffset], rot: Math.PI },     // South
    { pos: [-perimeterWidth / 2 - hallwayOffset, 0, -perimeterHeight / 4], rot: -Math.PI / 2 }, // West
    { pos: [perimeterWidth / 4, 0, hallwayOffset], rot: Math.PI },                            // Horizontal hallway
    { pos: [-hallwayOffset, 0, -perimeterHeight / 4], rot: -Math.PI / 2 },                    // Vertical hallway
  ];

  equipmentRooms.forEach((room, idx) => {
    if (idx < equipmentPositions.length) {
      const pos = equipmentPositions[idx];
      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number || `Room ${room.id}`,
        position: pos.pos as [number, number, number],
        labelRotation: pos.rot,
      });
    }
  });

  // Distribute patient rooms along all hallways
  const hallwayRoomPositions: Array<{ pos: [number, number, number], rot: number }> = [];

  // North hallway (left to right)
  for (let i = 0; i < 6; i++) {
    const x = -perimeterWidth / 2 + (i + 1) * (perimeterWidth / 7);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [x, 0, -perimeterHeight / 2 + side * hallwayOffset],
      rot: side > 0 ? Math.PI : 0,
    });
  }

  // East hallway (top to bottom)
  for (let i = 0; i < 5; i++) {
    const z = -perimeterHeight / 2 + (i + 1) * (perimeterHeight / 6);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [perimeterWidth / 2 + side * hallwayOffset, 0, z],
      rot: side > 0 ? Math.PI / 2 : -Math.PI / 2,
    });
  }

  // South hallway (right to left)
  for (let i = 0; i < 6; i++) {
    const x = perimeterWidth / 2 - (i + 1) * (perimeterWidth / 7);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [x, 0, perimeterHeight / 2 + side * hallwayOffset],
      rot: side > 0 ? 0 : Math.PI,
    });
  }

  // West hallway (bottom to top)
  for (let i = 0; i < 5; i++) {
    const z = perimeterHeight / 2 - (i + 1) * (perimeterHeight / 6);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [-perimeterWidth / 2 + side * hallwayOffset, 0, z],
      rot: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    });
  }

  // Horizontal cross-hallway
  for (let i = 0; i < 6; i++) {
    const x = -perimeterWidth / 2 + (i + 1) * (perimeterWidth / 7);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [x, 0, side * hallwayOffset],
      rot: side > 0 ? Math.PI : 0,
    });
  }

  // Vertical cross-hallway
  for (let i = 0; i < 5; i++) {
    const z = -perimeterHeight / 2 + (i + 1) * (perimeterHeight / 6);
    const side = i % 2 === 0 ? 1 : -1;
    hallwayRoomPositions.push({
      pos: [side * hallwayOffset, 0, z],
      rot: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    });
  }

  // Assign patient rooms to positions
  patientRooms.forEach((room, idx) => {
    if (idx < hallwayRoomPositions.length) {
      const pos = hallwayRoomPositions[idx];
      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number || `Room ${room.id}`,
        position: pos.pos,
        labelRotation: pos.rot,
      });
    }
  });

  // Add hallway intersections at key points
  // Corner intersections
  intersections.push(
    { position: [-perimeterWidth / 2, 0, -perimeterHeight / 2] }, // NW
    { position: [perimeterWidth / 2, 0, -perimeterHeight / 2] },  // NE
    { position: [perimeterWidth / 2, 0, perimeterHeight / 2] },   // SE
    { position: [-perimeterWidth / 2, 0, perimeterHeight / 2] }   // SW
  );

  // Cross-hallway intersections
  intersections.push(
    { position: [-perimeterWidth / 2, 0, 0] }, // West-Horizontal
    { position: [perimeterWidth / 2, 0, 0] },  // East-Horizontal
    { position: [0, 0, -perimeterHeight / 2] }, // North-Vertical
    { position: [0, 0, perimeterHeight / 2] },  // South-Vertical
    { position: [0, 0, 0] }  // Center intersection
  );

  return {
    roomLayouts,
    hallways,
    floorSections,
    walls, // Empty array - no walls
    intersections,
  };
}

// Component to track 3D position and update popup position
function PopupPositionTracker({
  position,
  onPositionUpdate
}: {
  position: [number, number, number] | null;
  onPositionUpdate: (screenPos: { x: number; y: number } | null) => void;
}) {
  const { camera, size } = useThree();

  useFrame(() => {
    if (position) {
      const vector = new THREE.Vector3(...position);
      vector.y += 3; // Position above the room
      vector.project(camera);

      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-(vector.y * 0.5) + 0.5) * size.height;

      onPositionUpdate({ x, y });
    } else {
      onPositionUpdate(null);
    }
  });

  return null;
}

// 2D Map Component
function Hospital2DMap({
  rooms,
  roomLayouts,
  hallways,
  floorSections,
  intersections,
  selectedRoomId,
  onRoomSelect,
  getRoomStatus
}: {
  rooms: Room[];
  roomLayouts: Map<string, {
    id: string;
    label: string;
    position: [number, number, number];
    labelRotation: number;
  }>;
  hallways: Array<{ start: [number, number, number]; end: [number, number, number] }>;
  floorSections: Array<{ position: [number, number, number]; size: [number, number] }>;
  intersections: Array<{ position: [number, number, number] }>;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  getRoomStatus: (roomId: string) => 'ready' | 'needs-attention' | 'occupied';
}) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Calculate SVG viewBox based on room positions
  const bounds = useMemo(() => {
    const positions = Array.from(roomLayouts.values()).map(r => r.position);
    if (positions.length === 0) return { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };

    const xValues = positions.map(p => p[0]);
    const zValues = positions.map(p => p[2]);

    return {
      minX: Math.min(...xValues) - 10,
      maxX: Math.max(...xValues) + 10,
      minZ: Math.min(...zValues) - 10,
      maxZ: Math.max(...zValues) + 10
    };
  }, [roomLayouts]);

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;

  const getStatusColor = (status: 'ready' | 'needs-attention' | 'occupied') => {
    switch (status) {
      case 'ready': return '#22c55e';
      case 'needs-attention': return '#ef4444';
      case 'occupied': return '#eab308';
      default: return '#6b7280';
    }
  };

  // Safety check for empty data
  if (roomLayouts.size === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#4b5563',
        color: 'white',
        fontSize: '16px'
      }}>
        Loading map...
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#4b5563',
      overflow: 'hidden'
    }}>
      <svg
        viewBox={`${bounds.minX} ${bounds.minZ} ${width} ${height}`}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Floor Sections - subtle background areas */}
        {floorSections.map((floor, index) => (
          <rect
            key={`floor-${index}`}
            x={floor.position[0] - floor.size[0] / 2}
            y={floor.position[2] - floor.size[1] / 2}
            width={floor.size[0]}
            height={floor.size[1]}
            fill="#d1d5db"
            opacity={0.3}
            rx={0.5}
          />
        ))}

        {/* Hallways - corridor structure */}
        {hallways.map((hallway, index) => (
          <g key={`hallway-${index}`}>
            {/* Main corridor */}
            <line
              x1={hallway.start[0]}
              y1={hallway.start[2]}
              x2={hallway.end[0]}
              y2={hallway.end[2]}
              stroke="#374151"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {/* Center stripe */}
            <line
              x1={hallway.start[0]}
              y1={hallway.start[2]}
              x2={hallway.end[0]}
              y2={hallway.end[2]}
              stroke="#4b5563"
              strokeWidth={0.4}
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Hallway intersections */}
        {intersections.map((intersection, index) => (
          <g key={`intersection-2d-${index}`}>
            <circle
              cx={intersection.position[0]}
              cy={intersection.position[2]}
              r={2}
              fill="#374151"
            />
            <circle
              cx={intersection.position[0]}
              cy={intersection.position[2]}
              r={0.5}
              fill="#4b5563"
            />
          </g>
        ))}

        {/* Central Command Station */}
        <g>
          <circle
            cx={0}
            cy={0}
            r={3.5}
            fill="#1f2937"
            stroke="#3b82f6"
            strokeWidth={0.4}
          />
          <circle
            cx={0}
            cy={0}
            r={2}
            fill="#3b82f6"
            opacity={0.3}
          />
          <text
            x={0}
            y={0.5}
            textAnchor="middle"
            fill="white"
            fontSize={1}
            fontWeight="bold"
          >
            COMMAND
          </text>
          <text
            x={0}
            y={1.5}
            textAnchor="middle"
            fill="white"
            fontSize={1}
            fontWeight="bold"
          >
            CENTER
          </text>
        </g>

        {/* Rooms */}
        {Array.from(roomLayouts.values()).map((layout) => {
          const status = getRoomStatus(layout.id);
          const color = getStatusColor(status);
          const isSelected = selectedRoomId === layout.id;
          const isHovered = hoveredRoom === layout.id;
          const scale = isSelected ? 1.15 : isHovered ? 1.08 : 1;

          return (
            <g
              key={layout.id}
              transform={`translate(${layout.position[0]}, ${layout.position[2]})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onRoomSelect(layout.id)}
              onMouseEnter={() => setHoveredRoom(layout.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              {/* Room rectangle */}
              <rect
                x={-1.5 * scale}
                y={-1.5 * scale}
                width={3 * scale}
                height={3 * scale}
                fill={color}
                stroke={isSelected ? 'white' : color}
                strokeWidth={isSelected ? 0.3 : 0.1}
                opacity={isHovered || isSelected ? 0.9 : 0.7}
                rx={0.3}
              />

              {/* Room label */}
              <text
                x={0}
                y={0.3}
                textAnchor="middle"
                fill="white"
                fontSize={0.6}
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {layout.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Hospital3DMap({
  rooms,
  equipment,
  onRoomSelect,
  selectedRoomId,
  onEnterRoom,
  onCloseRoomPopup
}: Hospital3DMapProps) {
  const { roomLayouts, hallways, floorSections, walls, intersections } = useMemo(() => createHospitalLayout(rooms), [rooms]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [is3DView, setIs3DView] = useState(true);
  const [popupData, setPopupData] = useState<{
    patient: { name: string; condition?: string | null; severity?: string | null } | null;
    doctor: { name: string; specialization?: string | null } | null;
  }>({ patient: null, doctor: null });

  // Debug logging
  useEffect(() => {
    console.log('Hospital3DMap - is3DView:', is3DView);
    console.log('Hospital3DMap - rooms count:', rooms.length);
    console.log('Hospital3DMap - roomLayouts size:', roomLayouts.size);
  }, [is3DView, rooms.length, roomLayouts.size]);

  // Subscribe to active tasks for visualization
  const { activeTasks } = useTaskSubscription();

  // Helper function to get room 3D position
  const getRoomPosition = (roomId: string): [number, number, number] | undefined => {
    const layout = roomLayouts.get(roomId);
    return layout?.position;
  };

  const getRoomStatus = (roomId: string): 'ready' | 'needs-attention' | 'occupied' => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 'ready';

    const status = room.status?.toLowerCase();
    if (status === 'ready' || status === 'available') return 'ready';
    if (status === 'occupied' || status === 'in-use') return 'occupied';
    if (status === 'cleaning' || status === 'maintenance') return 'needs-attention';

    return 'ready';
  };

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    const stats = {
      stable: 0,
      moderate: 0,
      critical: 0,
      empty: 0
    };

    rooms.forEach(room => {
      const status = room.status?.toLowerCase();

      if (status === 'ready' || status === 'available') {
        stats.empty++;
      } else if (status === 'critical' || status === 'needs-attention' || status === 'maintenance') {
        stats.critical++;
      } else if (status === 'moderate' || status === 'cleaning') {
        stats.moderate++;
      } else if (status === 'occupied' || status === 'in-use' || status === 'stable') {
        stats.stable++;
      } else {
        // Default to empty if status is unclear
        stats.empty++;
      }
    });

    return stats;
  }, [rooms]);

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;
  const selectedRoomLayout = selectedRoomId ? roomLayouts.get(selectedRoomId) : null;

  // Fetch patient and doctor data when room is selected
  useEffect(() => {
    if (!selectedRoomId) {
      setShowPopup(false);
      setPopupData({ patient: null, doctor: null });
      return;
    }

    setShowPopup(true);

    async function fetchRoomInfo() {
      try {
        // Fetch active assignment for this room
        const { data: assignment } = await supabase
          .from('room_assignments')
          .select('patient_id, assigned_doctor_id')
          .eq('room_id', selectedRoomId)
          .eq('is_active', true)
          .maybeSingle();

        if (!assignment) {
          setPopupData({ patient: null, doctor: null });
          return;
        }

        // Fetch patient data if exists
        let patientData = null;
        if (assignment.patient_id) {
          const { data: patient } = await supabase
            .from('patients')
            .select('name, condition, severity')
            .eq('id', assignment.patient_id)
            .maybeSingle();

          if (patient) {
            patientData = {
              name: patient.name,
              condition: patient.condition,
              severity: patient.severity
            };
          }
        }

        // Fetch doctor data if exists
        let doctorData = null;
        if (assignment.assigned_doctor_id) {
          const { data: doctor } = await supabase
            .from('staff')
            .select('name, specialty')
            .eq('id', assignment.assigned_doctor_id)
            .maybeSingle();

          if (doctor) {
            doctorData = {
              name: doctor.name,
              specialization: doctor.specialty
            };
          }
        }

        setPopupData({ patient: patientData, doctor: doctorData });
      } catch (error) {
        console.error('Error fetching room info:', error);
        setPopupData({ patient: null, doctor: null });
      }
    }

    fetchRoomInfo();
  }, [selectedRoomId]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#4b5563'
    }}>
      {/* View Toggle Switch */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 1000,
        background: 'rgba(31, 41, 55, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        gap: '4px'
      }}>
        <div
          onClick={() => setIs3DView(false)}
          style={{
            position: 'relative',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: !is3DView ? 'white' : 'rgba(255, 255, 255, 0.5)',
            zIndex: 1
          }}
        >
          2D
        </div>
        <div
          onClick={() => setIs3DView(true)}
          style={{
            position: 'relative',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: is3DView ? 'white' : 'rgba(255, 255, 255, 0.5)',
            zIndex: 1
          }}
        >
          3D
        </div>
        {/* Sliding indicator */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: is3DView ? 'calc(50% + 2px)' : '4px',
          width: 'calc(50% - 6px)',
          height: 'calc(100% - 8px)',
          background: 'rgba(34, 197, 94, 0.8)',
          borderRadius: '6px',
          transition: 'left 0.3s ease',
          zIndex: 0
        }} />
      </div>

      {is3DView ? (
        <Suspense fallback={<div>Loading...</div>}>
          <Canvas shadows camera={{ position: [38, 18, -11], fov: 60 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={1.3} castShadow />

          <CameraController
            targetPosition={selectedRoomLayout?.position || null}
            enabled={!!selectedRoomId}
          />

          <PopupPositionTracker
            position={selectedRoomLayout?.position || null}
            onPositionUpdate={setPopupPosition}
          />

          {/* Floor sections */}
          {floorSections.map((floor, index) => (
            <FloorSection key={`floor-${index}`} position={floor.position} size={floor.size} />
          ))}

          {/* Hallways - connecting corridors */}
          {hallways.map((hallway, index) => (
            <Hallway
              key={`hallway-${index}`}
              start={hallway.start}
              end={hallway.end}
            />
          ))}

          {/* Hallway intersections */}
          {intersections.map((intersection, index) => (
            <HallwayIntersection
              key={`intersection-${index}`}
              position={intersection.position}
            />
          ))}

          {/* Perimeter walls */}
          {/* {walls.map((wall, index) => (
            <PerimeterWall
              key={`wall-${index}`}
              position={wall.position}
              width={wall.width}
              rotation={wall.rotation}
              label={wall.label}
            />
          ))} */}

          {/* Central Command Station */}
          <CentralCommandStation position={[0, 0, 0]} />

          {/* Rooms */}
          {Array.from(roomLayouts.values()).map((layout) => (
            <SimpleRoom
              key={layout.id}
              position={layout.position}
              label={layout.label}
              status={getRoomStatus(layout.id)}
              roomId={layout.id}
              isSelected={selectedRoomId === layout.id}
              onClick={() => onRoomSelect(layout.id)}
              labelRotation={layout.labelRotation}
            />
          ))}

          {/* Task Path Animations */}
          <TaskPaths tasks={activeTasks} getRoomPosition={getRoomPosition} />

          {/* Room-Based Task Indicators */}
          <RoomTaskIndicators tasks={activeTasks} getRoomPosition={getRoomPosition} />
        </Canvas>
      </Suspense>
      ) : (
        <Hospital2DMap
          rooms={rooms}
          roomLayouts={roomLayouts}
          hallways={hallways}
          floorSections={floorSections}
          intersections={intersections}
          selectedRoomId={selectedRoomId}
          onRoomSelect={onRoomSelect}
          getRoomStatus={getRoomStatus}
        />
      )}

      {/* Overview Bar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(31, 41, 55, 0.7)',
        borderRadius: '8px',
        padding: '12px 24px',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '8px' }}>
            Floor 3 Overview
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>🟢</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{overviewStats.stable}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>Stable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>🟡</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{overviewStats.moderate}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>Moderate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>🔴</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{overviewStats.critical}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>Critical</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>⚪</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{overviewStats.empty}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>Empty</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {is3DView && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '16px',
          background: 'rgba(31, 41, 55, 0.95)',
          borderRadius: '8px',
          padding: '8px',
          color: 'white',
          fontSize: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Drag to rotate • Scroll to zoom • Click rooms
        </div>
      )}

      {/* Room Info Popup */}
      {selectedRoom && (
        <RoomInfoPopup
          open={showPopup}
          onOpenChange={(open) => {
            if (!open && onCloseRoomPopup) {
              onCloseRoomPopup();
            }
          }}
          room={selectedRoom}
          patient={popupData.patient}
          doctor={popupData.doctor}
          position={popupPosition}
          onEnterRoom={() => {
            if (onEnterRoom && selectedRoomId) {
              onEnterRoom(selectedRoomId);
              setShowPopup(false);
            }
          }}
        />
      )}

    </div>
  );
}
