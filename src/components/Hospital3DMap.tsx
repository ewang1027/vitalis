import React, { useRef, useState, Suspense } from 'react';
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

// Room component
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
  onClosePopup
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
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const targetY = isSelected ? 0.3 : hovered ? 0.15 : 0.1;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }
  });

  const getColor = () => {
    // Maintain status color even when selected
    switch (status) {
      case 'ready': return '#10b981';
      case 'needs-attention': return '#ef4444';
      case 'occupied': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[size[0], 0.05, size[2]]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Walls */}
      <mesh
        ref={meshRef}
        position={[0, size[1] / 2, 0]}
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
        castShadow
      >
        <boxGeometry args={[size[0] - 0.1, size[1], size[2] - 0.1]} />
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={isSelected ? 0.9 : hovered ? 0.7 : 0.5}
          emissive={getColor()}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
        />
      </mesh>

      {/* Room Label */}
      <Text
        position={[0, size[1] + 0.3, 0]}
        fontSize={0.3}
        color={isSelected ? getColor() : '#374151'}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>

      {/* Room Info Popup */}
      {isSelected && (
        <Html position={[0, size[1] + 0.8, 0]} center>
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
            {/* Close Button */}
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

// Corridor
function Corridor({ position, length, width, rotation = 0 }: {
  position: [number, number, number];
  length: number;
  width: number;
  rotation?: number;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} receiveShadow>
      <boxGeometry args={[length, 0.05, width]} />
      <meshStandardMaterial color="#e5e7eb" />
    </mesh>
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

export function Hospital3DMap({ rooms, equipment, onRoomSelect, selectedRoomId, onEnterRoom, onCloseRoomPopup }: Hospital3DMapProps) {
  // Transform rooms from database into 3D positions
  const room3DData = rooms.map((room, index) => {
    // Use database positions if available, otherwise calculate default positions
    const position: [number, number, number] = room.position_x !== null && room.position_y !== null && room.position_z !== null
      ? [room.position_x, room.position_y, room.position_z]
      : getDefaultPosition(index); // Fallback for rooms without positions

    return {
      id: room.id,
      position,
      size: [2.5, 1.5, 2.5] as [number, number, number],
      label: room.room_name || room.room_number,
      roomData: room
    };
  });

  // Helper function to calculate default positions for rooms without database positions
  function getDefaultPosition(index: number): [number, number, number] {
    const columns = 3;
    const spacing = 3.5;
    const row = Math.floor(index / columns);
    const col = index % columns;
    return [
      (col - 1) * spacing,
      0,
      (row - 1) * spacing
    ];
  }

  // Fixed corridors - these could also come from database in the future
  const corridors = [
    { position: [0, 0, 0] as [number, number, number], length: 16, width: 2, rotation: 0 },
    { position: [-3, 0, -1] as [number, number, number], length: 8, width: 1.5, rotation: Math.PI / 2 },
    { position: [3, 0, -1] as [number, number, number], length: 8, width: 1.5, rotation: Math.PI / 2 },
  ];

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
        <Canvas shadows camera={{ position: [0, 12, 12], fov: 50 }}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <hemisphereLight args={['#87ceeb', '#f0e68c', 0.6]} />

          {/* Controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.2}
          />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>

          {/* Corridors */}
          {corridors.map((corridor, idx) => (
            <Corridor key={`corridor-${idx}`} {...corridor} />
          ))}

          {/* Rooms */}
          {room3DData.map((room) => (
            <Room
              key={room.id}
              position={room.position}
              size={room.size}
              label={room.label}
              status={getRoomStatus(room.id)}
              roomId={room.id}
              isSelected={selectedRoomId === room.id}
              onClick={() => onRoomSelect(room.id)}
              roomData={room.roomData}
              onEnterRoom={onEnterRoom}
              onClosePopup={onCloseRoomPopup}
            />
          ))}
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
