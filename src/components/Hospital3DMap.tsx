import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Billboard } from '@react-three/drei';
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
const groupRef = useRef<THREE.Group>(null);
const [hovered, setHovered] = useState(false);

const getStatusColor = () => {
switch (status) {
case 'ready': return '#10b981';
case 'needs-attention': return '#ef4444';
case 'occupied': return '#f59e0b';
default: return '#6b7280';
}
};

const wallHeight = size[1];
const wallThickness = 0.15;
const doorWidth = 1.2;

const handleInteraction = (e: any) => {
e.stopPropagation();
onClick();
};

const handlePointerOver = (e: any) => {
e.stopPropagation();
setHovered(true);
if (document.body.style) {
document.body.style.cursor = 'pointer';
}
};

const handlePointerOut = () => {
setHovered(false);
if (document.body.style) {
document.body.style.cursor = 'auto';
}
};

return (
<group ref={groupRef} position={position}>
{/* Floor */}
<mesh position={[0, 0.02, 0]} receiveShadow>
<boxGeometry args={[size[0], 0.04, size[2]]} />
<meshStandardMaterial 
color="#ffffff" 
roughness={0.8}
metalness={0.1}
/>
</mesh>

{/* Back Wall (North) */}
<mesh 
position={[0, wallHeight / 2, -size[2] / 2 + wallThickness / 2]} 
castShadow 
receiveShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[size[0], wallHeight, wallThickness]} />
<meshStandardMaterial 
color="#e8f0f2" 
roughness={0.9}
metalness={0.05}
emissive={isSelected ? getStatusColor() : '#000000'}
emissiveIntensity={isSelected ? 0.15 : 0}
/>
</mesh>

{/* Left Wall (West) */}
<mesh 
position={[-size[0] / 2 + wallThickness / 2, wallHeight / 2, 0]} 
castShadow 
receiveShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[wallThickness, wallHeight, size[2]]} />
<meshStandardMaterial 
color="#e8f0f2" 
roughness={0.9}
metalness={0.05}
emissive={isSelected ? getStatusColor() : '#000000'}
emissiveIntensity={isSelected ? 0.15 : 0}
/>
</mesh>

{/* Right Wall (East) */}
<mesh 
position={[size[0] / 2 - wallThickness / 2, wallHeight / 2, 0]} 
castShadow 
receiveShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[wallThickness, wallHeight, size[2]]} />
<meshStandardMaterial 
color="#e8f0f2" 
roughness={0.9}
metalness={0.05}
emissive={isSelected ? getStatusColor() : '#000000'}
emissiveIntensity={isSelected ? 0.15 : 0}
/>
</mesh>

{/* Front Wall (South) - Split for door opening */}
{/* Left part of front wall */}
<mesh 
position={[-size[0] / 2 + (size[0] - doorWidth) / 4, wallHeight / 2, size[2] / 2 - wallThickness / 2]} 
castShadow 
receiveShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[(size[0] - doorWidth) / 2, wallHeight, wallThickness]} />
<meshStandardMaterial 
color="#e8f0f2" 
roughness={0.9}
metalness={0.05}
emissive={isSelected ? getStatusColor() : '#000000'}
emissiveIntensity={isSelected ? 0.15 : 0}
/>
</mesh>

{/* Right part of front wall */}
<mesh 
position={[size[0] / 2 - (size[0] - doorWidth) / 4, wallHeight / 2, size[2] / 2 - wallThickness / 2]} 
castShadow 
receiveShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[(size[0] - doorWidth) / 2, wallHeight, wallThickness]} />
<meshStandardMaterial 
color="#e8f0f2" 
roughness={0.9}
metalness={0.05}
emissive={isSelected ? getStatusColor() : '#000000'}
emissiveIntensity={isSelected ? 0.15 : 0}
/>
</mesh>

{/* Door frame */}
<mesh 
position={[0, 0, size[2] / 2 - wallThickness / 2]} 
castShadow
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
>
<boxGeometry args={[doorWidth + 0.1, wallHeight * 0.85, wallThickness * 0.5]} />
<meshStandardMaterial 
color="#8b9aab" 
roughness={0.4}
metalness={0.6}
/>
</mesh>

{/* Status indicator light above door */}
<mesh position={[0, wallHeight * 0.9, size[2] / 2 - 0.05]} castShadow>
<boxGeometry args={[0.6, 0.15, 0.05]} />
<meshStandardMaterial 
color={getStatusColor()} 
emissive={getStatusColor()}
emissiveIntensity={hovered ? 0.8 : 0.6}
roughness={0.3}
metalness={0.7}
/>
</mesh>

{/* Interior furniture - Simple bed representation */}
<group position={[-size[0] / 4, 0.3, -size[2] / 4]}>
<mesh castShadow>
<boxGeometry args={[1.2, 0.3, 2]} />
<meshStandardMaterial color="#c9d6df" roughness={0.8} />
</mesh>
<mesh position={[0, 0.4, -0.7]} castShadow>
<boxGeometry args={[1.2, 0.5, 0.6]} />
<meshStandardMaterial color="#8b9aab" roughness={0.6} />
</mesh>
</group>

{/* Small side table */}
<mesh position={[size[0] / 4, 0.35, -size[2] / 4]} castShadow>
<boxGeometry args={[0.5, 0.7, 0.5]} />
<meshStandardMaterial color="#d4d4d4" roughness={0.7} />
</mesh>

	{/* Room Label */}
	<Billboard
		follow={true}
		lockX={false}
		lockY={false}
		lockZ={false}
		position={[0, wallHeight + 0.4, 0]}
	>
		<Text
			fontSize={0.3}
			color={isSelected ? getStatusColor() : '#374151'}
			anchorX="center"
			anchorY="middle"
		>
			{label}
		</Text>
	</Billboard>

{/* Room Info Popup */}
{isSelected && (
<Html position={[0, wallHeight + 0.9, 0]} center>
<div style={{
background: 'white',
borderRadius: '8px',
boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
padding: '12px',
minWidth: '220px',
maxWidth: '280px',
border: `2px solid ${getStatusColor()}`,
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
<meshStandardMaterial color="#9ca3af" />
</mesh>
);
}

// Help Desk component
function HelpDesk({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Desk base */}
<mesh position={[0, 0.5, 0]} castShadow>
<boxGeometry args={[3, 1, 2]} />
<meshStandardMaterial color="#374151" />
</mesh>
{/* Desk top */}
<mesh position={[0, 1.05, 0]} castShadow>
<boxGeometry args={[3.2, 0.1, 2.2]} />
<meshStandardMaterial color="#1f2937" />
</mesh>
{/* Computer screen */}
<mesh position={[0, 1.5, -0.3]} castShadow>
<boxGeometry args={[0.8, 0.6, 0.05]} />
<meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} />
</mesh>
{/* Label */}
<Text
position={[0, 2, 0]}
fontSize={0.35}
color="#10b981"
anchorX="center"
anchorY="middle"
>
HELP DESK
</Text>
{/* Info sign */}
<mesh position={[0, 2.5, 0]} castShadow>
<cylinderGeometry args={[0.05, 0.05, 1.5]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
<mesh position={[0, 3.2, 0]} castShadow>
<boxGeometry args={[0.6, 0.6, 0.1]} />
<meshStandardMaterial color="#10b981" />
</mesh>
<Text
position={[0, 3.2, 0.06]}
fontSize={0.25}
color="white"
anchorX="center"
anchorY="middle"
>
ℹ️
</Text>
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

export function Hospital3DMap({ rooms, equipment, onRoomSelect, selectedRoomId, onEnterRoom, onCloseRoomPopup }: Hospital3DMapProps) {
// Sort rooms: central rooms (storage/supplies/utilities) first, then perimeter rooms
const sortedRooms = [...rooms].sort((a, b) => {
const aCentral = isCentralRoom(a);
const bCentral = isCentralRoom(b);
if (aCentral && !bCentral) return -1;
if (!aCentral && bCentral) return 1;
return 0;
});

// Transform rooms from database into 3D positions
const room3DData = sortedRooms.map((room, index) => {
// Always use the new calculated floor plan positions for clean layout
const position: [number, number, number] = getDefaultPosition(index);

return {
id: room.id,
position,
size: [3.2, 1.8, 3.2] as [number, number, number], // Clean, uniform room size
label: room.room_name || room.room_number,
roomData: room
};
});

// Helper to determine if room should be in central area
function isCentralRoom(room: Room): boolean {
const type = room.room_type?.toLowerCase() || '';
const name = room.room_name?.toLowerCase() || '';
const number = room.room_number?.toLowerCase() || '';
const combined = `${type} ${name} ${number}`;
return combined.includes('storage') ||
combined.includes('supply') ||
combined.includes('supplies') ||
combined.includes('utility') ||
combined.includes('utilities') ||
combined.includes('pharmacy') ||
combined.includes('med') ||
combined.includes('equipment') ||
combined.includes('clean') ||
combined.includes('dirty') ||
combined.includes('linen') ||
combined.includes('triage') ||
combined.includes('nurse') && combined.includes('station');
}

// Helper function to calculate default positions for rooms without database positions
// Layout: 4 central + 12 perimeter (3 per side) + 4 corner rooms = 20 total capacity
function getDefaultPosition(index: number): [number, number, number] {
// First 4 rooms are CENTRAL rooms (storage, supplies, utilities, etc.)
if (index < 4) {
const centralPositions: [number, number, number][] = [
[-5, 0, -5], // Top-left of center (NW)
[5, 0, -5],  // Top-right of center (NE)
[5, 0, 5],   // Bottom-right of center (SE)
[-5, 0, 5],  // Bottom-left of center (SW)
];
return centralPositions[index];
}

// Rooms 4-15 are PERIMETER rooms (3 per side)
const perimeterIndex = index - 4; // 0-11
if (perimeterIndex < 12) {
const roomsPerSide = 3; // 3 rooms on each side
const roomSpacing = 6.5; // Spacing between rooms
const baseOffset = 13; // Distance from center
const side = Math.floor(perimeterIndex / roomsPerSide); // 0=top, 1=right, 2=bottom, 3=left
const posInSide = perimeterIndex % roomsPerSide; // 0, 1, or 2
const sideOffset = (posInSide - 1) * roomSpacing; // Positions: -6.5, 0, 6.5

switch(side) {
case 0: // TOP ROW (North) - 3 rooms
return [sideOffset, 0, -baseOffset];
case 1: // RIGHT COLUMN (East) - 3 rooms
return [baseOffset, 0, sideOffset];
case 2: // BOTTOM ROW (South) - 3 rooms
return [sideOffset, 0, baseOffset];
case 3: // LEFT COLUMN (West) - 3 rooms
return [-baseOffset, 0, sideOffset];
}
}

// Rooms 16-19 are CORNER rooms
const cornerIndex = index - 16; // 0-3
if (cornerIndex < 4) {
const cornerOffset = 11; // Diagonal distance for corners
const cornerPositions: [number, number, number][] = [
[-cornerOffset, 0, -cornerOffset], // Top-left corner (NW)
[cornerOffset, 0, -cornerOffset],  // Top-right corner (NE)
[cornerOffset, 0, cornerOffset],   // Bottom-right corner (SE)
[-cornerOffset, 0, cornerOffset],  // Bottom-left corner (SW)
];
return cornerPositions[cornerIndex];
}

// Additional rooms beyond 20 - arrange in outer ring
const extraIndex = index - 20;
const extraAngle = (extraIndex / 8) * Math.PI * 2;
const extraRadius = 22;
return [
Math.cos(extraAngle) * extraRadius,
0,
Math.sin(extraAngle) * extraRadius
];
}

// Clean minimal corridor system - central area + perimeter loop
const baseOffset = 13; // Same as in getDefaultPosition
const corridors = [
// CENTRAL AREA - Large open floor around help desk and 4 central rooms
{ position: [0, 0, 0] as [number, number, number], length: 16, width: 16, rotation: 0 },

// MAIN HORIZONTAL CORRIDORS (East-West perimeter)
{ position: [0, 0, -baseOffset] as [number, number, number], length: 32, width: 4.5, rotation: 0 }, // Top corridor
{ position: [0, 0, baseOffset] as [number, number, number], length: 32, width: 4.5, rotation: 0 }, // Bottom corridor

// MAIN VERTICAL CORRIDORS (North-South perimeter)
{ position: [-baseOffset, 0, 0] as [number, number, number], length: 32, width: 4.5, rotation: Math.PI / 2 }, // Left corridor
{ position: [baseOffset, 0, 0] as [number, number, number], length: 32, width: 4.5, rotation: Math.PI / 2 }, // Right corridor

// PERIMETER ROOM CONNECTIONS (3 rooms per side at positions -6.5, 0, 6.5)
// Top row connections
{ position: [-6.5, 0, -baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },
{ position: [0, 0, -baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },
{ position: [6.5, 0, -baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },

// Bottom row connections
{ position: [-6.5, 0, baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },
{ position: [0, 0, baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },
{ position: [6.5, 0, baseOffset] as [number, number, number], length: 6, width: 3, rotation: Math.PI / 2 },

// Left column connections
{ position: [-baseOffset, 0, -6.5] as [number, number, number], length: 6, width: 3, rotation: 0 },
{ position: [-baseOffset, 0, 0] as [number, number, number], length: 6, width: 3, rotation: 0 },
{ position: [-baseOffset, 0, 6.5] as [number, number, number], length: 6, width: 3, rotation: 0 },

// Right column connections
{ position: [baseOffset, 0, -6.5] as [number, number, number], length: 6, width: 3, rotation: 0 },
{ position: [baseOffset, 0, 0] as [number, number, number], length: 6, width: 3, rotation: 0 },
{ position: [baseOffset, 0, 6.5] as [number, number, number], length: 6, width: 3, rotation: 0 },

// CENTRAL TO PERIMETER CONNECTIONS - Connect central area to perimeter corridors
{ position: [0, 0, -9.5] as [number, number, number], length: 7, width: 4, rotation: 0 }, // North connector
{ position: [0, 0, 9.5] as [number, number, number], length: 7, width: 4, rotation: 0 }, // South connector
{ position: [-9.5, 0, 0] as [number, number, number], length: 7, width: 4, rotation: Math.PI / 2 }, // West connector
{ position: [9.5, 0, 0] as [number, number, number], length: 7, width: 4, rotation: Math.PI / 2 }, // East connector

// CORNER ROOM CONNECTIONS - Diagonal corridors to corner rooms
{ position: [-11, 0, -11] as [number, number, number], length: 4.5, width: 2.5, rotation: Math.PI / 4 }, // Top-left corner
{ position: [11, 0, -11] as [number, number, number], length: 4.5, width: 2.5, rotation: -Math.PI / 4 }, // Top-right corner
{ position: [11, 0, 11] as [number, number, number], length: 4.5, width: 2.5, rotation: Math.PI / 4 }, // Bottom-right corner
{ position: [-11, 0, 11] as [number, number, number], length: 4.5, width: 2.5, rotation: -Math.PI / 4 }, // Bottom-left corner
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
<Canvas shadows camera={{ position: [0, 22, 22], fov: 60 }}>
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
				minDistance={8}
				maxDistance={40}
				maxPolarAngle={Math.PI / 2.2}
			/>

			{/* Corridors */}
{corridors.map((corridor, idx) => (
<Corridor key={`corridor-${idx}`} {...corridor} />
))}

{/* Central Help Desk - at the center of main corridor */}
<HelpDesk position={[0, 0, 0]} />

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