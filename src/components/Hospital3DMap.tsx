import React, { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Database } from '@/lib/supabase';
import type { Asset } from '@/types/wardops';

type Room = Database['public']['Tables']['rooms']['Row'];

interface Hospital3DMapProps {
  rooms: Room[];
  equipment: Asset[];
  onRoomSelect: (roomId: string) => void;
  selectedRoomId: string | null;
  onEnterRoom?: (roomId: string) => void;
  onCloseRoomPopup?: () => void;
}

// Room layout configuration for realistic hospital design
interface RoomLayout {
  position: [number, number, number];
  size: [number, number, number];
  rotation: number;
  doorPosition: 'front' | 'back' | 'left' | 'right';
}

// Realistic Room component with walls, windows, and room-type specific styling
function Room({
  position,
  size,
  label,
  status,
  roomId,
  isSelected,
  onClick,
  roomData,
  onEnterRoom,
  onClosePopup,
  rotation = 0,
  doorPosition = 'front',
  roomType = 'patient'
}: {
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  status: 'ready' | 'needs-attention' | 'occupied';
  roomId: string;
  isSelected: boolean;
  onClick: () => void;
  roomData?: Room;
  onEnterRoom?: (roomId: string) => void;
  onClosePopup?: () => void;
  rotation?: number;
  doorPosition?: 'front' | 'back' | 'left' | 'right';
  roomType?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (groupRef.current) {
      const targetY = isSelected ? 0.15 : hovered ? 0.08 : 0;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1;
    }
  });

  const getColor = () => {
    switch (status) {
      case 'ready': return '#10b981';
      case 'needs-attention': return '#ef4444';
      case 'occupied': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Room type specific colors and styling
  const getRoomTypeColor = () => {
    switch (roomType) {
      case 'icu': return '#dbeafe'; // Light blue
      case 'operating': return '#fce7f3'; // Light pink
      case 'emergency': return '#fef3c7'; // Light yellow
      case 'patient': return '#f0fdf4'; // Light green
      case 'specialty': return '#f3e8ff'; // Light purple
      default: return '#f8f9fa';
    }
  };

  const getAccentColor = () => {
    switch (roomType) {
      case 'icu': return '#3b82f6'; // Blue
      case 'operating': return '#ec4899'; // Pink
      case 'emergency': return '#f59e0b'; // Amber
      case 'patient': return '#10b981'; // Green
      case 'specialty': return '#a855f7'; // Purple
      default: return '#6b7280';
    }
  };

  const wallThickness = 0.15;
  const wallHeight = size[1];
  const doorWidth = 1.0;
  const doorHeight = 2.0;
  const hasWindow = roomType === 'icu' || roomType === 'patient' || roomType === 'emergency';

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={groupRef}>
        {/* Floor with room type color */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[size[0], 0.05, size[2]]} />
          <meshStandardMaterial color={getRoomTypeColor()} roughness={0.8} />
        </mesh>

        {/* Accent stripe on floor */}
        <mesh position={[0, 0.03, -size[2] / 2 + 0.3]} receiveShadow>
          <boxGeometry args={[size[0] - 0.2, 0.01, 0.2]} />
          <meshStandardMaterial color={getAccentColor()} roughness={0.6} />
        </mesh>

        {/* Back Wall with window if applicable */}
        {hasWindow ? (
          <>
            {/* Wall sections around window */}
            <mesh position={[-size[0] / 4, wallHeight / 2, -size[2] / 2]} receiveShadow castShadow>
              <boxGeometry args={[size[0] / 2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[size[0] / 4, wallHeight / 2, -size[2] / 2]} receiveShadow castShadow>
              <boxGeometry args={[size[0] / 2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            {/* Window */}
            <mesh position={[0, wallHeight / 2 + 0.5, -size[2] / 2 + wallThickness / 4]} castShadow>
              <boxGeometry args={[1.2, 1.2, wallThickness / 2]} />
              <meshStandardMaterial
                color="#87ceeb"
                transparent
                opacity={0.3}
                roughness={0.1}
                metalness={0.1}
              />
            </mesh>
            {/* Window frame */}
            <mesh position={[0, wallHeight / 2 + 0.5, -size[2] / 2 + wallThickness / 8]}>
              <boxGeometry args={[1.3, 0.05, wallThickness / 4]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
            <mesh position={[0, wallHeight / 2 + 0.5, -size[2] / 2 + wallThickness / 8]}>
              <boxGeometry args={[0.05, 1.3, wallThickness / 4]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, wallHeight / 2, -size[2] / 2]} receiveShadow castShadow>
            <boxGeometry args={[size[0], wallHeight, wallThickness]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.9} />
          </mesh>
        )}

        {/* Front Wall (with door gap) */}
        {doorPosition === 'front' ? (
          <>
            <mesh position={[-size[0] / 2 + (size[0] - doorWidth) / 4, wallHeight / 2, size[2] / 2]} receiveShadow castShadow>
              <boxGeometry args={[(size[0] - doorWidth) / 2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[size[0] / 2 - (size[0] - doorWidth) / 4, wallHeight / 2, size[2] / 2]} receiveShadow castShadow>
              <boxGeometry args={[(size[0] - doorWidth) / 2, wallHeight, wallThickness]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            {/* Door frame */}
            <mesh position={[0, doorHeight / 2, size[2] / 2 - wallThickness / 2]} receiveShadow castShadow>
              <boxGeometry args={[doorWidth, doorHeight, wallThickness / 2]} />
              <meshStandardMaterial
                color={getColor()}
                transparent
                opacity={0.3}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          </>
        ) : (
          <mesh position={[0, wallHeight / 2, size[2] / 2]} receiveShadow castShadow>
            <boxGeometry args={[size[0], wallHeight, wallThickness]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.9} />
          </mesh>
        )}

        {/* Left Wall (with door gap if needed) */}
        {doorPosition === 'left' ? (
          <>
            <mesh position={[-size[0] / 2, wallHeight / 2, -size[2] / 2 + (size[2] - doorWidth) / 4]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness, wallHeight, (size[2] - doorWidth) / 2]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[-size[0] / 2, wallHeight / 2, size[2] / 2 - (size[2] - doorWidth) / 4]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness, wallHeight, (size[2] - doorWidth) / 2]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[-size[0] / 2 + wallThickness / 2, doorHeight / 2, 0]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness / 2, doorHeight, doorWidth]} />
              <meshStandardMaterial
                color={getColor()}
                transparent
                opacity={0.3}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          </>
        ) : (
          <mesh position={[-size[0] / 2, wallHeight / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[wallThickness, wallHeight, size[2]]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.9} />
          </mesh>
        )}

        {/* Right Wall (with door gap if needed) */}
        {doorPosition === 'right' ? (
          <>
            <mesh position={[size[0] / 2, wallHeight / 2, -size[2] / 2 + (size[2] - doorWidth) / 4]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness, wallHeight, (size[2] - doorWidth) / 2]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[size[0] / 2, wallHeight / 2, size[2] / 2 - (size[2] - doorWidth) / 4]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness, wallHeight, (size[2] - doorWidth) / 2]} />
              <meshStandardMaterial color="#e9ecef" roughness={0.9} />
            </mesh>
            <mesh position={[size[0] / 2 - wallThickness / 2, doorHeight / 2, 0]} receiveShadow castShadow>
              <boxGeometry args={[wallThickness / 2, doorHeight, doorWidth]} />
              <meshStandardMaterial
                color={getColor()}
                transparent
                opacity={0.3}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
          </>
        ) : (
          <mesh position={[size[0] / 2, wallHeight / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[wallThickness, wallHeight, size[2]]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.9} />
          </mesh>
        )}

        {/* Status indicator light on wall */}
        <mesh position={[0, wallHeight - 0.3, size[2] / 2 - 0.1]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={getColor()}
            emissive={getColor()}
            emissiveIntensity={isSelected ? 1.0 : hovered ? 0.8 : 0.5}
          />
        </mesh>

        {/* Invisible clickable area */}
        <mesh
          position={[0, wallHeight / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            if (document.body.style) {
              document.body.style.cursor = 'pointer';
            }
          }}
          onPointerOut={() => {
            setHovered(false);
            if (document.body.style) {
              document.body.style.cursor = 'auto';
            }
          }}
        >
          <boxGeometry args={[size[0], wallHeight, size[2]]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </group>

      {/* Room Label */}
      <Text
        position={[0, wallHeight + 0.5, 0]}
        fontSize={0.35}
        color={isSelected ? getColor() : '#1f2937'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {label}
      </Text>

      {/* Room Info Popup */}
      {isSelected && (
        <Html position={[0, wallHeight + 1.2, 0]} center>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
            minWidth: '220px',
            maxWidth: '280px',
            border: `2px solid ${getColor()}`,
            position: 'relative'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClosePopup?.();
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6b7280',
                padding: '2px',
                lineHeight: 1
              }}
            >
              ×
            </button>

            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', paddingRight: '20px' }}>
              {label}
            </h3>

            {roomData && (
              <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                <p style={{ fontWeight: '600', color: '#1f2937' }}>{roomData.room_name}</p>
                <p style={{ fontSize: '11px', color: '#6b7280' }}>
                  Status: {roomData.status} • Type: {roomData.room_type}
                  {roomData.floor && ` • Floor ${roomData.floor}`}
                </p>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnterRoom?.(roomId);
              }}
              style={{
                width: '100%',
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              🔍 Enter Room (3D View)
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

// Enhanced Corridor with walls
function Corridor({ position, length, width, rotation = 0, hasWalls = true }: {
  position: [number, number, number];
  length: number;
  width: number;
  rotation?: number;
  hasWalls?: boolean;
}) {
  const wallThickness = 0.15;
  const wallHeight = 2.8;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Corridor floor */}
      <mesh receiveShadow>
        <boxGeometry args={[length, 0.05, width]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.9} />
      </mesh>

      {hasWalls && (
        <>
          {/* Left wall */}
          <mesh position={[0, wallHeight / 2, -width / 2]} receiveShadow castShadow>
            <boxGeometry args={[length, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#f3f4f6" roughness={0.9} />
          </mesh>

          {/* Right wall */}
          <mesh position={[0, wallHeight / 2, width / 2]} receiveShadow castShadow>
            <boxGeometry args={[length, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#f3f4f6" roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}

// Exterior wall component
function ExteriorWall({ position, length, height, rotation = 0 }: {
  position: [number, number, number];
  length: number;
  height: number;
  rotation?: number;
}) {
  const wallThickness = 0.2;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[length, height, wallThickness]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} />
      </mesh>
      {/* Wall trim/accent at top */}
      <mesh position={[0, height - 0.1, 0]} castShadow>
        <boxGeometry args={[length, 0.2, wallThickness + 0.05]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading 3D Map...</p>
      </div>
    </div>
  );
}

// Waiting area furniture
function WaitingChair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#4a5568" roughness={0.8} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.5, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#4a5568" roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[-0.2, 0.2].map((x, i) =>
        [-0.2, 0.2].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0.125, z]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.25, 8]} />
            <meshStandardMaterial color="#2d3748" metalness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

// Nurse station
function NurseStation({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.8, 1.2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[2.1, 0.05, 1.3]} />
        <meshStandardMaterial color="#d2b48c" roughness={0.4} />
      </mesh>
      {/* Computer monitor */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Screen glow */}
      <mesh position={[0, 1.1, 0.03]}>
        <planeGeometry args={[0.45, 0.35]} />
        <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Decorative plant
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Plant leaves */}
      {[0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.15, 0.4, Math.sin(angle) * 0.15]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#2d5016" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Directional sign
function DirectionalSign({ position, rotation = 0, text, color = '#3b82f6' }: {
  position: [number, number, number];
  rotation?: number;
  text: string;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Sign post */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[1.5, 0.4, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Sign text */}
      <Text
        position={[0, 2.2, 0.03]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
      >
        {text}
      </Text>
      {/* Arrow */}
      <mesh position={[0.5, 2.2, 0.03]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.15, 3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Central circular hub component
function CentralHub({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Central circular platform */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[3.5, 3.5, 0.08, 32]} />
        <meshStandardMaterial color="#e0e7ff" roughness={0.7} />
      </mesh>

      {/* Central help desk - circular counter */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2, 2, 1, 32]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>

      {/* Counter top */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <cylinderGeometry args={[2.1, 2.1, 0.08, 32]} />
        <meshStandardMaterial color="#d2b48c" roughness={0.4} />
      </mesh>

      {/* Multiple computer stations around the desk */}
      {[0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <mesh position={[0, 1.3, 1.5]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, 1.3, 1.52]}>
            <planeGeometry args={[0.35, 0.25]} />
            <meshStandardMaterial color="#4a9eff" emissive="#4a9eff" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Central sign above */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>

      <Text
        position={[0, 2.5, 0.06]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        RECEPTION
      </Text>
    </group>
  );
}

// Function to create circular hub-and-spoke hospital layout
function createHospitalLayout(rooms: Room[]): {
  roomLayouts: Map<string, RoomLayout & { id: string; label: string; roomData: Room; roomType: string }>;
  corridors: Array<{ position: [number, number, number]; length: number; width: number; rotation: number; hasWalls: boolean }>;
  furniture: Array<{ type: 'chair' | 'station' | 'plant' | 'sign' | 'hub'; position: [number, number, number]; rotation?: number; text?: string; color?: string }>;
  exteriorWalls: Array<{ position: [number, number, number]; length: number; height: number; rotation: number }>;
} {
  const roomLayouts = new Map<string, RoomLayout & { id: string; label: string; roomData: Room; roomType: string }>();
  const corridors: Array<{ position: [number, number, number]; length: number; width: number; rotation: number; hasWalls: boolean }> = [];
  const furniture: Array<{ type: 'chair' | 'station' | 'plant' | 'sign' | 'hub'; position: [number, number, number]; rotation?: number; text?: string; color?: string }> = [];
  const exteriorWalls: Array<{ position: [number, number, number]; length: number; height: number; rotation: number }> = [];

  const hubRadius = 3.5; // Central hub radius
  const corridorWidth = 2.5;
  const roomSpacing = 0.6;

  // Add central hub
  furniture.push({ type: 'hub', position: [0, 0, 0] });

  // Categorize rooms by type
  const icuRooms = rooms.filter(r => r.room_type?.toLowerCase().includes('icu') || r.room_type?.toLowerCase().includes('intensive'));
  const emergencyRooms = rooms.filter(r => r.room_type?.toLowerCase().includes('emergency') || r.room_type?.toLowerCase().includes('er'));
  const operatingRooms = rooms.filter(r => r.room_type?.toLowerCase().includes('operating') || r.room_type?.toLowerCase().includes('surgery') || r.room_type?.toLowerCase().includes('or'));
  const patientRooms = rooms.filter(r =>
    !icuRooms.includes(r) && !emergencyRooms.includes(r) && !operatingRooms.includes(r) &&
    (r.room_type?.toLowerCase().includes('patient') || r.room_type?.toLowerCase().includes('ward') || !r.room_type)
  );
  const specialtyRooms = rooms.filter(r =>
    !icuRooms.includes(r) && !emergencyRooms.includes(r) && !operatingRooms.includes(r) && !patientRooms.includes(r)
  );

  // Room sizes by type
  const roomSizes = {
    icu: [3.5, 2.8, 3] as [number, number, number],
    operating: [3.8, 3, 3.5] as [number, number, number],
    emergency: [3, 2.6, 2.8] as [number, number, number],
    patient: [2.6, 2.6, 2.4] as [number, number, number],
    specialty: [2.8, 2.6, 2.8] as [number, number, number],
  };

  // Entrance/exit angles (gaps in the circle)
  const entranceAngle1 = Math.PI / 4; // 45 degrees (northeast)
  const entranceAngle2 = Math.PI + Math.PI / 4; // 225 degrees (southwest)
  const entranceGapSize = Math.PI / 8; // Gap size for each entrance

  // Combine all rooms with their types
  const allRoomsWithTypes = [
    ...icuRooms.map(r => ({ room: r, type: 'icu' as const })),
    ...operatingRooms.map(r => ({ room: r, type: 'operating' as const })),
    ...emergencyRooms.map(r => ({ room: r, type: 'emergency' as const })),
    ...patientRooms.map(r => ({ room: r, type: 'patient' as const })),
    ...specialtyRooms.map(r => ({ room: r, type: 'specialty' as const })),
  ];

  const totalRooms = allRoomsWithTypes.length;

  if (totalRooms > 0) {
    // Calculate available angle (full circle minus two entrance gaps)
    const totalGapAngle = entranceGapSize * 2;
    const availableAngle = 2 * Math.PI - totalGapAngle;
    const anglePerRoom = availableAngle / totalRooms;

    // Distance from center to room (back of room touches perimeter)
    const circleRadius = hubRadius + corridorWidth + 3;

    let currentAngle = 0;
    let roomIndex = 0;

    for (let i = 0; i < totalRooms; i++) {
      // Skip entrance gaps
      if (Math.abs(currentAngle - entranceAngle1) < entranceGapSize / 2) {
        currentAngle += entranceGapSize;
      }
      if (Math.abs(currentAngle - entranceAngle2) < entranceGapSize / 2) {
        currentAngle += entranceGapSize;
      }

      const { room, type } = allRoomsWithTypes[roomIndex];
      const roomSize = roomSizes[type];

      const x = Math.cos(currentAngle) * circleRadius;
      const z = Math.sin(currentAngle) * circleRadius;

      roomLayouts.set(room.id, {
        id: room.id,
        label: room.room_name || room.room_number,
        roomData: room,
        roomType: type,
        position: [x, 0, z],
        size: roomSize,
        rotation: -currentAngle + Math.PI / 2, // Face inward toward center
        doorPosition: 'front'
      });

      // Add radial corridor from hub to room
      const corridorLength = circleRadius - hubRadius - corridorWidth / 2;
      const corridorMidRadius = hubRadius + corridorLength / 2 + corridorWidth / 2;
      const corridorX = Math.cos(currentAngle) * corridorMidRadius;
      const corridorZ = Math.sin(currentAngle) * corridorMidRadius;

      corridors.push({
        position: [corridorX, 0, corridorZ],
        length: corridorLength,
        width: 1.5,
        rotation: -currentAngle + Math.PI / 2,
        hasWalls: false
      });

      currentAngle += anglePerRoom;
      roomIndex++;
    }

    // Add pod signs at key positions
    const podMarkers = [
      { angle: 0, label: 'ICU', color: '#3b82f6' },
      { angle: Math.PI / 2, label: 'OR', color: '#ec4899' },
      { angle: Math.PI, label: 'EMERGENCY', color: '#f59e0b' },
      { angle: 3 * Math.PI / 2, label: 'PATIENTS', color: '#10b981' },
    ];

    podMarkers.forEach(marker => {
      const signRadius = hubRadius + 2;
      const signX = Math.cos(marker.angle) * signRadius;
      const signZ = Math.sin(marker.angle) * signRadius;

      furniture.push({
        type: 'sign',
        position: [signX, 0, signZ],
        rotation: -marker.angle + Math.PI / 2,
        text: marker.label,
        color: marker.color
      });
    });

    // Add entrance signs at gaps
    const entrance1X = Math.cos(entranceAngle1) * (circleRadius + 1.5);
    const entrance1Z = Math.sin(entranceAngle1) * (circleRadius + 1.5);
    furniture.push({
      type: 'sign',
      position: [entrance1X, 0, entrance1Z],
      rotation: -entranceAngle1 + Math.PI / 2,
      text: 'ENTRANCE',
      color: '#6b7280'
    });

    const entrance2X = Math.cos(entranceAngle2) * (circleRadius + 1.5);
    const entrance2Z = Math.sin(entranceAngle2) * (circleRadius + 1.5);
    furniture.push({
      type: 'sign',
      position: [entrance2X, 0, entrance2Z],
      rotation: -entranceAngle2 + Math.PI / 2,
      text: 'EXIT',
      color: '#6b7280'
    });

    // Add waiting chairs around the hub
    for (let i = 0; i < 8; i++) {
      const chairAngle = (i * Math.PI) / 4;
      const chairRadius = hubRadius + 0.8;
      furniture.push({
        type: 'chair',
        position: [Math.cos(chairAngle) * chairRadius, 0, Math.sin(chairAngle) * chairRadius],
        rotation: -chairAngle + Math.PI / 2
      });
    }

    // Add plants between some chairs
    for (let i = 0; i < 4; i++) {
      const plantAngle = (i * Math.PI) / 2 + Math.PI / 4;
      const plantRadius = hubRadius + 0.9;
      furniture.push({
        type: 'plant',
        position: [Math.cos(plantAngle) * plantRadius, 0, Math.sin(plantAngle) * plantRadius]
      });
    }
  }

  // No exterior walls needed - rooms form the perimeter themselves!

  return { roomLayouts, corridors, furniture, exteriorWalls };
}

export function Hospital3DMap({ rooms, equipment, onRoomSelect, selectedRoomId, onEnterRoom, onCloseRoomPopup }: Hospital3DMapProps) {
  // Generate hospital layout using intelligent positioning
  const { roomLayouts, corridors, furniture, exteriorWalls } = useMemo(() => createHospitalLayout(rooms), [rooms]);

  const getRoomStatus = (roomId: string): 'ready' | 'needs-attention' | 'occupied' => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 'ready';

    // Map database status to visual status
    const status = room.status?.toLowerCase();
    if (status === 'ready' || status === 'available') return 'ready';
    if (status === 'occupied' || status === 'in-use') return 'occupied';
    if (status === 'cleaning' || status === 'maintenance') return 'needs-attention';

    // Alternatively, check equipment in the room
    const roomEquipment = equipment.filter(e => e.roomId === roomId);
    if (roomEquipment.length === 0) return 'ready';

    const readyCount = roomEquipment.filter(e => e.state === 'idle_ready').length;
    const totalCount = roomEquipment.length;

    if (readyCount === totalCount) return 'ready';
    if (readyCount === 0) return 'needs-attention';
    return 'occupied';
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas shadows camera={{ position: [20, 14, 20], fov: 55 }}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[15, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
          />
          <hemisphereLight args={['#b8d4f0', '#f0e68c', 0.6]} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />

          {/* Controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={60}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0, 0]}
          />

          {/* Exterior Walls */}
          {exteriorWalls.map((wall, idx) => (
            <ExteriorWall key={`wall-${idx}`} {...wall} />
          ))}

          {/* Corridors */}
          {corridors.map((corridor, idx) => (
            <Corridor key={`corridor-${idx}`} {...corridor} />
          ))}

          {/* Rooms */}
          {Array.from(roomLayouts.values()).map((roomLayout) => (
            <Room
              key={roomLayout.id}
              position={roomLayout.position}
              size={roomLayout.size}
              label={roomLayout.label}
              status={getRoomStatus(roomLayout.id)}
              roomId={roomLayout.id}
              isSelected={selectedRoomId === roomLayout.id}
              onClick={() => onRoomSelect(roomLayout.id)}
              roomData={roomLayout.roomData}
              onEnterRoom={onEnterRoom}
              onClosePopup={onCloseRoomPopup}
              rotation={roomLayout.rotation}
              doorPosition={roomLayout.doorPosition}
              roomType={roomLayout.roomType}
            />
          ))}

          {/* Furniture and Signs */}
          {furniture.map((item, idx) => {
            if (item.type === 'chair') {
              return <WaitingChair key={`chair-${idx}`} position={item.position} rotation={item.rotation} />;
            } else if (item.type === 'station') {
              return <NurseStation key={`station-${idx}`} position={item.position} rotation={item.rotation} />;
            } else if (item.type === 'plant') {
              return <Plant key={`plant-${idx}`} position={item.position} />;
            } else if (item.type === 'sign') {
              return <DirectionalSign key={`sign-${idx}`} position={item.position} rotation={item.rotation} text={item.text || ''} color={item.color} />;
            } else if (item.type === 'hub') {
              return <CentralHub key={`hub-${idx}`} position={item.position} />;
            }
            return null;
          })}
        </Canvas>
      </Suspense>

      {/* Info Overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Ward Overview</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }}></div>
            <span style={{ color: '#374151' }}>Ready</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f59e0b' }}></div>
            <span style={{ color: '#374151' }}>Occupied</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ef4444' }}></div>
            <span style={{ color: '#374151' }}>Needs Attention</span>
          </div>
        </div>
      </div>

      {/* Controls Info */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>
          🖱️ Drag to rotate • Scroll to zoom • Click rooms for details
        </p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
