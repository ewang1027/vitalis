import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomReadiness } from '@/types/wardops';

interface Hospital3DMapProps {
  roomReadiness: RoomReadiness[];
  onRoomSelect: (roomId: string) => void;
  selectedRoomId: string | null;
  onEnterRoom?: (roomId: string) => void;
  onCloseRoomPopup?: () => void;
  roomDetails?: any;
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
  roomDetail,
  onEnterRoom,
  onClosePopup
}: {
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  status: 'ready' | 'needs-attention' | 'in-progress';
  roomId: string;
  isSelected: boolean;
  onClick: () => void;
  roomDetail?: any;
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
    if (isSelected) return '#10b981';
    switch (status) {
      case 'ready': return '#10b981';
      case 'needs-attention': return '#ef4444';
      case 'in-progress': return '#f59e0b';
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
        color={isSelected ? '#10b981' : '#374151'}
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
            border: '2px solid #10b981',
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

            {roomDetail?.patient && (
              <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                <p style={{ fontWeight: '600', color: '#1f2937' }}>{roomDetail.patient.name}</p>
                <p style={{ fontSize: '11px', color: '#6b7280' }}>{roomDetail.patient.condition}</p>
              </div>
            )}

            {roomDetail?.vitals && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                marginBottom: '10px',
                fontSize: '11px',
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '4px'
              }}>
                <div>
                  <span style={{ color: '#6b7280' }}>HR: </span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>{roomDetail.vitals.heartRate}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>O2: </span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>{roomDetail.vitals.oxygenSaturation}%</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>BP: </span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>{roomDetail.vitals.bloodPressure}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Temp: </span>
                  <span style={{ fontWeight: '600', color: '#1f2937' }}>{roomDetail.vitals.temperature}°F</span>
                </div>
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

export function Hospital3DMap({ roomReadiness, onRoomSelect, selectedRoomId, onEnterRoom, onCloseRoomPopup, roomDetails }: Hospital3DMapProps) {
  const rooms = [
    { id: 'room-101', position: [-6, 0, -4] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 101' },
    { id: 'room-102', position: [-6, 0, -0.5] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 102' },
    { id: 'room-103', position: [-6, 0, 3] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 103' },
    { id: 'room-104', position: [6, 0, -4] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 104' },
    { id: 'room-105', position: [6, 0, -0.5] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 105' },
    { id: 'room-106', position: [6, 0, 3] as [number, number, number], size: [2.5, 1.5, 2.5] as [number, number, number], label: 'Room 106' },
    { id: 'nurse-station', position: [0, 0, -4] as [number, number, number], size: [3, 1.5, 2] as [number, number, number], label: 'Nurse Station' },
    { id: 'storage', position: [0, 0, 3] as [number, number, number], size: [2, 1.5, 2] as [number, number, number], label: 'Storage' },
  ];

  const corridors = [
    { position: [0, 0, 0] as [number, number, number], length: 16, width: 2, rotation: 0 },
    { position: [-3, 0, -1] as [number, number, number], length: 8, width: 1.5, rotation: Math.PI / 2 },
    { position: [3, 0, -1] as [number, number, number], length: 8, width: 1.5, rotation: Math.PI / 2 },
  ];

  const getRoomStatus = (roomId: string): 'ready' | 'needs-attention' | 'in-progress' => {
    const room = roomReadiness.find(r => r.roomId === roomId);
    if (!room || !room.equipment || !Array.isArray(room.equipment) || room.equipment.length === 0) {
      return 'ready';
    }

    const readyCount = room.equipment.filter(e => e.status === 'ready').length;
    const totalCount = room.equipment.length;

    if (readyCount === totalCount) return 'ready';
    if (readyCount === 0) return 'needs-attention';
    return 'in-progress';
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
          {rooms.map((room) => (
            <Room
              key={room.id}
              position={room.position}
              size={room.size}
              label={room.label}
              status={getRoomStatus(room.id)}
              roomId={room.id}
              isSelected={selectedRoomId === room.id}
              onClick={() => onRoomSelect(room.id)}
              roomDetail={roomDetails?.[room.id]}
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
            <span style={{ color: '#374151' }}>In Progress</span>
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
