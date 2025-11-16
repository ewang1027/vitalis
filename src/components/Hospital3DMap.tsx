import React, { useRef, useState, Suspense, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Database } from '@/lib/supabase';
import type { Asset } from '@/types/wardops';
import { useTaskSubscription } from '@/hooks/useTaskSubscription';
import { TaskPaths } from './TaskPathAnimation';
import { RoomTaskIndicators } from './RoomTaskIndicator';

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

// Central Help Desk
function HelpDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 1, 8]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.5} />
      </mesh>

      {/* Desk top */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.2, 0.1, 8]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
      </mesh>

      {/* Sign above */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 8]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.3}
        />
      </mesh>

      <Text
        position={[0, 2.5, 0.15]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        HELP DESK
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
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={50}
    />
  );
}

// Hallway connecting rooms - medium gray floor
function Hallway({
  start,
  end,
  width = 1.5
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
    <mesh position={[midX, -1.05, midZ]} rotation={[0, angle, 0]} receiveShadow>
      <boxGeometry args={[length, 0.1, width]} />
      <meshStandardMaterial color="#9ca3af" roughness={0.7} />
    </mesh>
  );
}

// Hospital layout with central desk and wings
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
} {
  const roomLayouts = new Map();
  const hallways: Array<{ start: [number, number, number]; end: [number, number, number] }> = [];
  const floorSections: Array<{ position: [number, number, number]; size: [number, number] }> = [];
  const walls: Array<{ position: [number, number, number]; width: number; rotation: number; label: string }> = [];

  const roomsPerWing = Math.ceil(rooms.length / 4);
  const roomSpacing = 6; // Space between rooms in a wing
  const wingDistance = 8; // Distance from center to start of wing

  // Define 4 wings (North, East, South, West)
  const wings = [
    { name: 'North', direction: [0, 0, -1], start: [0, 0, -wingDistance] }, // North
    { name: 'East', direction: [1, 0, 0], start: [wingDistance, 0, 0] },   // East
    { name: 'South', direction: [0, 0, 1], start: [0, 0, wingDistance] },  // South
    { name: 'West', direction: [-1, 0, 0], start: [-wingDistance, 0, 0] }, // West
  ];

  const positions: Array<[number, number, number]> = [];
  let roomIndex = 0;

  wings.forEach((wing, wingIdx) => {
    const wingRooms = rooms.slice(roomIndex, Math.min(roomIndex + roomsPerWing, rooms.length));
    const centerPoint: [number, number, number] = [wing.start[0], wing.start[1], wing.start[2]];

    // Create hallway from center to wing entrance
    hallways.push({
      start: [0, 0, 0],
      end: centerPoint
    });

    wingRooms.forEach((room, idx) => {
      // Alternate rooms on left and right sides of the corridor
      const side = idx % 2 === 0 ? 1 : -1;
      const distanceAlongWing = Math.floor(idx / 2) * roomSpacing;

      let position: [number, number, number];

      // Calculate position based on wing direction
      if (wing.name === 'North' || wing.name === 'South') {
        position = [
          wing.start[0] + side * 5,
          0,
          wing.start[2] + wing.direction[2] * distanceAlongWing
        ];
      } else {
        position = [
          wing.start[0] + wing.direction[0] * distanceAlongWing,
          0,
          wing.start[2] + side * 5
        ];
      }

      positions.push(position);

      // Calculate label rotation to face outward
      let labelRotation = 0;
      if (wing.name === 'North') {
        labelRotation = side === 1 ? -Math.PI / 2 : Math.PI / 2; // East rooms face east, West rooms face west
      } else if (wing.name === 'South') {
        labelRotation = side === 1 ? Math.PI / 2 : -Math.PI / 2; // East rooms face east, West rooms face west
      } else if (wing.name === 'East') {
        labelRotation = side === 1 ? Math.PI : 0; // South rooms face south, North rooms face north
      } else if (wing.name === 'West') {
        labelRotation = side === 1 ? 0 : Math.PI; // North rooms face north, South rooms face south
      }

      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number || `Room ${roomIndex + idx + 1}`,
        position,
        labelRotation,
      });

      // Connect room to corridor
      if (wing.name === 'North' || wing.name === 'South') {
        hallways.push({
          start: [wing.start[0], 0, wing.start[2] + wing.direction[2] * distanceAlongWing],
          end: position
        });
      } else {
        hallways.push({
          start: [wing.start[0] + wing.direction[0] * distanceAlongWing, 0, wing.start[2]],
          end: position
        });
      }

      // Create corridor hallways along the wing
      if (idx > 1) {
        const prevDistanceAlongWing = Math.floor((idx - 2) / 2) * roomSpacing;
        if (wing.name === 'North' || wing.name === 'South') {
          hallways.push({
            start: [wing.start[0], 0, wing.start[2] + wing.direction[2] * prevDistanceAlongWing],
            end: [wing.start[0], 0, wing.start[2] + wing.direction[2] * distanceAlongWing]
          });
        } else {
          hallways.push({
            start: [wing.start[0] + wing.direction[0] * prevDistanceAlongWing, 0, wing.start[2]],
            end: [wing.start[0] + wing.direction[0] * distanceAlongWing, 0, wing.start[2]]
          });
        }
      }
    });

    roomIndex += wingRooms.length;
  });

  // Create continuous floor for each wing based on actual room extent
  wings.forEach((wing, wingIdx) => {
    const startIdx = wingIdx * roomsPerWing;
    const endIdx = Math.min(startIdx + roomsPerWing, rooms.length);
    const wingPositions = positions.slice(startIdx, endIdx);

    if (wingPositions.length > 0) {
      // Get bounds of rooms in this wing
      const xPositions = wingPositions.map(p => p[0]);
      const zPositions = wingPositions.map(p => p[2]);
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      const minZ = Math.min(...zPositions);
      const maxZ = Math.max(...zPositions);

      // Create floor section for entire wing area
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const width = (maxX - minX) + 5;
      const depth = (maxZ - minZ) + 5;

      floorSections.push({
        position: [centerX, -1.1, centerZ],
        size: [width, depth]
      });

      // Add only exterior walls (not walls facing the center)
      const wallHeight = 1.5;

      if (wing.name === 'North') {
        // North wing: keep north, east, west walls (remove south wall facing center)
        walls.push({
          position: [centerX, wallHeight / 2, centerZ - depth / 2],
          width: width,
          rotation: 0,
          label: 'North Wing - Far Wall'
        });
        walls.push({
          position: [centerX + width / 2, wallHeight / 2, centerZ - depth / 4],
          width: depth / 2,
          rotation: Math.PI / 2,
          label: 'North Wing - East Side'
        });
        walls.push({
          position: [centerX - width / 2, wallHeight / 2, centerZ - depth / 4],
          width: depth * 0.7,
          rotation: Math.PI / 2,
          label: 'North Wing - West Side'
        });
      } else if (wing.name === 'South') {
        // South wing: keep south, east, west walls (remove north wall facing center)
        walls.push({
          position: [centerX, wallHeight / 2, centerZ + depth / 2],
          width: width,
          rotation: 0,
          label: 'South Wing - Far Wall'
        });
        walls.push({
          position: [centerX + width / 2, wallHeight / 2, centerZ + depth / 4],
          width: depth / 2,
          rotation: Math.PI / 2,
          label: 'South Wing - East Side'
        });
        // Extended West Side wall (80%)
        walls.push({
          position: [centerX - width / 2, wallHeight / 2, centerZ + depth / 5],
          width: depth * 0.7,
          rotation: Math.PI / 2,
          label: 'South Wing - West Side'
        });
      } else if (wing.name === 'East') {
        // East wing: keep east, north, south walls (remove west wall facing center)
        walls.push({
          position: [centerX + width / 2, wallHeight / 2, centerZ],
          width: depth,
          rotation: Math.PI / 2,
          label: 'East Wing - Far Wall'
        });
        walls.push({
          position: [centerX + width / 4, wallHeight / 2, centerZ - depth / 2],
          width: width / 2,
          rotation: 0,
          label: 'East Wing - North Side'
        });
        walls.push({
          position: [centerX + width / 4, wallHeight / 2, centerZ + depth / 2],
          width: width / 2,
          rotation: 0,
          label: 'East Wing - South Side'
        });
      } else if (wing.name === 'West') {
        // West wing: keep west, north, south walls (remove east wall facing center)
        walls.push({
          position: [centerX - width / 2, wallHeight / 2, centerZ],
          width: depth,
          rotation: Math.PI / 2,
          label: 'West Wing - Far Wall'
        });
        walls.push({
          position: [centerX - width / 4, wallHeight / 2, centerZ - depth / 2],
          width: width / 2,
          rotation: 0,
          label: 'West Wing - North Side'
        });
        walls.push({
          position: [centerX - width / 4, wallHeight / 2, centerZ + depth / 2],
          width: width / 2,
          rotation: 0,
          label: 'West Wing - South Side'
        });
      }
    }
  });

  // Add central floor section around help desk (no walls)
  const centralSize = 20;
  floorSections.push({
    position: [0, -1.1, 0],
    size: [centralSize, centralSize]
  });

  return { roomLayouts, hallways, floorSections, walls };
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

export function Hospital3DMap({
  rooms,
  equipment,
  onRoomSelect,
  selectedRoomId
}: Hospital3DMapProps) {
  const { roomLayouts, hallways, floorSections, walls } = useMemo(() => createHospitalLayout(rooms), [rooms]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

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

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : null;
  const selectedRoomLayout = selectedRoomId ? roomLayouts.get(selectedRoomId) : null;

  useEffect(() => {
    setShowPopup(!!selectedRoomId);
  }, [selectedRoomId]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#4b5563'
    }}>
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

          {/* Central Help Desk */}
          <HelpDesk position={[0, 0, 0]} />

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

      {/* Status Legend */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(31, 41, 55, 0.95)',
        borderRadius: '8px',
        padding: '12px',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
          Room Status
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#10b981', borderRadius: '2px' }}></div>
            <span>Ready</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '2px' }}></div>
            <span>Occupied</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '2px' }}></div>
            <span>Needs Attention</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
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

    </div>
  );
}
