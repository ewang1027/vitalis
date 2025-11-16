import React, { useRef, useState, Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

// Dotted Line Component for path visualization
function DottedPathLine({ points }: { points: [number, number, number][] }) {
	const lineRef = useRef<THREE.Line>(null);

	// Create the line object with proper geometry
	const lineObject = useMemo(() => {
		if (points.length < 2) return null;

		// Create curve from points
		const vectors = points.map(p => new THREE.Vector3(...p));
		const curve = new THREE.CatmullRomCurve3(vectors);
		const curvePoints = curve.getPoints(100);

		// Create geometry
		const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

		// Create material
		const material = new THREE.LineDashedMaterial({
			color: 0x10b981,
			dashSize: 0.3,
			gapSize: 0.2,
			opacity: 0.8,
			transparent: true,
		});

		// Create line
		const line = new THREE.Line(geometry, material);
		line.computeLineDistances(); // Required for dashed lines - must be called on Line, not geometry
		return line;
	}, [points]);

	// Animate the dash offset for moving effect
	useFrame(() => {
		if (lineRef.current && lineRef.current.material) {
			const material = lineRef.current.material as THREE.LineDashedMaterial & { dashOffset: number };
			material.dashOffset -= 0.02; // Animate the dashes
		}
	});

	if (!lineObject) return null;

	return <primitive ref={lineRef} object={lineObject} />;
}

// Equipment Components
function HospitalBed({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Bed frame */}
<mesh position={[0, 0.3, 0]} castShadow>
<boxGeometry args={[1.8, 0.6, 0.9]} />
<meshStandardMaterial color="#f0f0f0" />
</mesh>
{/* Mattress */}
<mesh position={[0, 0.65, 0]} castShadow>
<boxGeometry args={[1.7, 0.15, 0.85]} />
<meshStandardMaterial color="#e8e8ff" />
</mesh>
{/* Pillow */}
<mesh position={[0, 0.75, -0.3]} castShadow>
<boxGeometry args={[0.5, 0.1, 0.3]} />
<meshStandardMaterial color="#ffffff" />
</mesh>
</group>
);
}

function VitalsMonitor({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Stand */}
<mesh position={[0, 0.5, 0]} castShadow>
<cylinderGeometry args={[0.05, 0.05, 1]} />
<meshStandardMaterial color="#808080" />
</mesh>
{/* Monitor screen */}
<mesh position={[0, 1.1, 0]} castShadow>
<boxGeometry args={[0.4, 0.3, 0.05]} />
<meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.3} />
</mesh>
</group>
);
}

function StorageShelf({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Shelf frame */}
<mesh position={[0, 0.8, 0]} castShadow>
<boxGeometry args={[1.2, 1.6, 0.4]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
{/* Shelves */}
<mesh position={[0, 0.4, 0.15]} castShadow>
<boxGeometry args={[1.1, 0.05, 0.35]} />
<meshStandardMaterial color="#a0826d" />
</mesh>
<mesh position={[0, 0.8, 0.15]} castShadow>
<boxGeometry args={[1.1, 0.05, 0.35]} />
<meshStandardMaterial color="#a0826d" />
</mesh>
<mesh position={[0, 1.2, 0.15]} castShadow>
<boxGeometry args={[1.1, 0.05, 0.35]} />
<meshStandardMaterial color="#a0826d" />
</mesh>
</group>
);
}

function ExamTable({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Table base */}
<mesh position={[0, 0.4, 0]} castShadow>
<boxGeometry args={[0.8, 0.8, 0.5]} />
<meshStandardMaterial color="#c0c0c0" />
</mesh>
{/* Table top */}
<mesh position={[0, 0.85, 0]} castShadow>
<boxGeometry args={[1.8, 0.1, 0.7]} />
<meshStandardMaterial color="#e0e0e0" />
</mesh>
</group>
);
}

function NurseDesk({ position }: { position: [number, number, number] }) {
return (
<group position={position}>
{/* Desk */}
<mesh position={[0, 0.4, 0]} castShadow>
<boxGeometry args={[1.5, 0.8, 0.8]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
{/* Computer */}
<mesh position={[0.3, 0.9, 0]} castShadow>
<boxGeometry args={[0.3, 0.25, 0.05]} />
<meshStandardMaterial color="#1e293b" emissive="#10b981" emissiveIntensity={0.2} />
</mesh>
</group>
);
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

{/* Large invisible hitbox for easy clicking - covers entire room area */}
<mesh
position={[0, wallHeight / 2, 0]}
onClick={handleInteraction}
onPointerOver={handlePointerOver}
onPointerOut={handlePointerOut}
visible={false}
>
<boxGeometry args={[size[0], wallHeight, size[2]]} />
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

{/* Room-specific equipment based on room type */}
{(() => {
const roomType = roomData?.room_type?.toLowerCase() || '';
const roomName = roomData?.room_name?.toLowerCase() || '';
const roomNumber = roomData?.room_number?.toLowerCase() || '';
const combined = `${roomType} ${roomName} ${roomNumber}`;

// Storage Room Equipment - Multiple shelves and supplies
if (combined.includes('storage') || combined.includes('supply') || combined.includes('supplies')) {
return (
<>
<StorageShelf position={[-0.9, 0, -0.8]} />
<StorageShelf position={[0, 0, -0.8]} />
<StorageShelf position={[0.9, 0, -0.8]} />
<StorageShelf position={[-0.9, 0, 0.5]} />
<StorageShelf position={[0.9, 0, 0.5]} />
{/* Supply boxes on floor */}
<mesh position={[0, 0.15, 0.8]} castShadow>
<boxGeometry args={[0.4, 0.3, 0.4]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
<mesh position={[0.5, 0.15, 0.8]} castShadow>
<boxGeometry args={[0.4, 0.3, 0.4]} />
<meshStandardMaterial color="#a0826d" />
</mesh>
</>
);
}

// Patient Room Equipment - Bed, vitals, side table
if (combined.includes('patient') || (combined.includes('room') && !combined.includes('storage') && !combined.includes('exam'))) {
return (
<>
<HospitalBed position={[-0.5, 0, -0.3]} />
<VitalsMonitor position={[0.9, 0, -0.3]} />
{/* Bedside table */}
<mesh position={[-0.5, 0.35, 0.7]} castShadow>
<boxGeometry args={[0.4, 0.7, 0.4]} />
<meshStandardMaterial color="#d4d4d4" />
</mesh>
{/* IV Stand */}
<group position={[0.5, 0, 0.2]}>
<mesh castShadow>
<cylinderGeometry args={[0.03, 0.05, 1.5]} />
<meshStandardMaterial color="#c0c0c0" />
</mesh>
<mesh position={[0, 1.5, 0]} castShadow>
<sphereGeometry args={[0.08]} />
<meshStandardMaterial color="#e0e0e0" />
</mesh>
</group>
{/* Chair */}
<group position={[0.9, 0, 0.7]}>
<mesh position={[0, 0.25, 0]} castShadow>
<boxGeometry args={[0.4, 0.5, 0.4]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
<mesh position={[0, 0.6, -0.15]} castShadow>
<boxGeometry args={[0.4, 0.4, 0.1]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
</group>
</>
);
}

// Triage/Exam Room Equipment - Exam table, vitals, medical cart
if (combined.includes('triage') || combined.includes('exam')) {
return (
<>
<ExamTable position={[0, 0, -0.2]} />
<VitalsMonitor position={[1, 0, 0.3]} />
{/* Medical supply cart */}
<group position={[-1, 0, 0.5]}>
<mesh position={[0, 0.4, 0]} castShadow>
<boxGeometry args={[0.5, 0.8, 0.3]} />
<meshStandardMaterial color="#e0e0e0" />
</mesh>
<mesh position={[-0.15, 0.1, 0]} castShadow>
<cylinderGeometry args={[0.04, 0.04, 0.2]} />
<meshStandardMaterial color="#808080" />
</mesh>
<mesh position={[0.15, 0.1, 0]} castShadow>
<cylinderGeometry args={[0.04, 0.04, 0.2]} />
<meshStandardMaterial color="#808080" />
</mesh>
</group>
{/* Wall-mounted equipment */}
<mesh position={[size[0] / 2 - 0.3, 1.2, -size[2] / 3]} castShadow>
<boxGeometry args={[0.1, 0.4, 0.3]} />
<meshStandardMaterial color="#c0c0c0" />
</mesh>
</>
);
}

// Nurse Station Equipment - Desk, computers, filing
if (combined.includes('nurse') && combined.includes('station')) {
return (
<>
<NurseDesk position={[0, 0, -0.3]} />
{/* Filing cabinet */}
<mesh position={[-1, 0.5, 0.8]} castShadow>
<boxGeometry args={[0.5, 1, 0.6]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
{/* Additional computer station */}
<group position={[0.8, 0, 0.5]}>
<mesh position={[0, 0.4, 0]} castShadow>
<boxGeometry args={[0.6, 0.8, 0.5]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
<mesh position={[0, 0.9, 0]} castShadow>
<boxGeometry args={[0.25, 0.2, 0.05]} />
<meshStandardMaterial color="#1e293b" emissive="#10b981" emissiveIntensity={0.2} />
</mesh>
</group>
</>
);
}

// Operating/Procedure Room Equipment
if (combined.includes('operating') || combined.includes('surgery') || combined.includes('procedure') || combined.includes('or ')) {
return (
<>
<ExamTable position={[0, 0, 0]} />
{/* Large surgical light */}
<group position={[0, 2, 0]}>
<mesh castShadow>
<cylinderGeometry args={[0.6, 0.4, 0.2]} />
<meshStandardMaterial color="#e0e0e0" emissive="#ffffff" emissiveIntensity={0.5} />
</mesh>
</group>
{/* Equipment cart */}
<group position={[1.2, 0, 0.5]}>
<mesh position={[0, 0.5, 0]} castShadow>
<boxGeometry args={[0.6, 1, 0.4]} />
<meshStandardMaterial color="#c0c0c0" />
</mesh>
</group>
<VitalsMonitor position={[-1.2, 0, 0]} />
</>
);
}

// ICU/Critical Care - Similar to patient room but more equipment
if (combined.includes('icu') || combined.includes('intensive') || combined.includes('critical')) {
return (
<>
<HospitalBed position={[0, 0, -0.3]} />
<VitalsMonitor position={[1, 0, -0.5]} />
<VitalsMonitor position={[-1, 0, -0.5]} />
{/* Large medical equipment */}
<mesh position={[1, 0.6, 0.6]} castShadow>
<boxGeometry args={[0.5, 1.2, 0.4]} />
<meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.3} />
</mesh>
{/* IV Stand */}
<group position={[-0.7, 0, 0.3]}>
<mesh castShadow>
<cylinderGeometry args={[0.03, 0.05, 1.5]} />
<meshStandardMaterial color="#c0c0c0" />
</mesh>
</group>
</>
);
}

// Utility/Clean/Dirty Rooms - Basic shelving and equipment
if (combined.includes('utility') || combined.includes('utilities') || combined.includes('clean') || combined.includes('dirty') || combined.includes('linen')) {
return (
<>
<StorageShelf position={[-0.8, 0, -0.6]} />
<StorageShelf position={[0.8, 0, -0.6]} />
{/* Utility sink */}
<mesh position={[0, 0.5, 0.8]} castShadow>
<boxGeometry args={[0.8, 1, 0.5]} />
<meshStandardMaterial color="#e0e0e0" />
</mesh>
{/* Bins */}
<mesh position={[-0.8, 0.3, 0.6]} castShadow>
<boxGeometry args={[0.4, 0.6, 0.4]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
<mesh position={[0.8, 0.3, 0.6]} castShadow>
<boxGeometry args={[0.4, 0.6, 0.4]} />
<meshStandardMaterial color="#6b7280" />
</mesh>
</>
);
}

// Pharmacy - Shelves and medication storage
if (combined.includes('pharmacy') || combined.includes('medication') || combined.includes('med')) {
return (
<>
<StorageShelf position={[-1, 0, -0.7]} />
<StorageShelf position={[0, 0, -0.7]} />
<StorageShelf position={[1, 0, -0.7]} />
{/* Pharmacy counter */}
<group position={[0, 0, 0.6]}>
<mesh position={[0, 0.4, 0]} castShadow>
<boxGeometry args={[2, 0.8, 0.6]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
<mesh position={[0.6, 0.9, 0]} castShadow>
<boxGeometry args={[0.3, 0.25, 0.05]} />
<meshStandardMaterial color="#1e293b" emissive="#10b981" emissiveIntensity={0.2} />
</mesh>
</group>
</>
);
}

// Waiting Area/Lobby
if (combined.includes('waiting') || combined.includes('lobby') || combined.includes('reception')) {
return (
<>
{/* Chairs arranged in rows */}
{[-0.8, 0, 0.8].map((x, i) => (
<group key={i} position={[x, 0, -0.5]}>
<mesh position={[0, 0.25, 0]} castShadow>
<boxGeometry args={[0.5, 0.5, 0.5]} />
<meshStandardMaterial color="#3b82f6" />
</mesh>
<mesh position={[0, 0.6, -0.2]} castShadow>
<boxGeometry args={[0.5, 0.5, 0.1]} />
<meshStandardMaterial color="#3b82f6" />
</mesh>
</group>
))}
{/* Small table with magazines */}
<mesh position={[0, 0.3, 0.6]} castShadow>
<boxGeometry args={[0.8, 0.6, 0.5]} />
<meshStandardMaterial color="#8b7355" />
</mesh>
</>
);
}

// Default: Basic medical room with minimal furniture
return (
<>
{/* Basic exam table */}
<ExamTable position={[0, 0, -0.3]} />
{/* Small equipment cart */}
<mesh position={[0.8, 0.4, 0.5]} castShadow>
<boxGeometry args={[0.5, 0.8, 0.4]} />
<meshStandardMaterial color="#d4d4d4" />
</mesh>
</>
);
})()}

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

// Camera Controller for smooth animations
function CameraController({
targetPosition,
targetLookAt,
selectedRoomId
}: {
targetPosition: [number, number, number] | null;
targetLookAt: [number, number, number] | null;
selectedRoomId: string | null;
}) {
const { camera } = useThree();
const controlsRef = useRef<any>(null);
const animatingRef = useRef(false);
const targetPosRef = useRef<THREE.Vector3 | null>(null);
const targetLookRef = useRef<THREE.Vector3 | null>(null);
const userInteractingRef = useRef(false);

// Set animation targets when they change
useEffect(() => {
if (targetPosition && targetLookAt) {
targetPosRef.current = new THREE.Vector3(...targetPosition);
targetLookRef.current = new THREE.Vector3(...targetLookAt);
animatingRef.current = true;
userInteractingRef.current = false;
}
}, [targetPosition, targetLookAt, selectedRoomId]);

useFrame(() => {
// Only animate if user is not interacting
if (animatingRef.current && !userInteractingRef.current && targetPosRef.current && targetLookRef.current && controlsRef.current) {
const distance = camera.position.distanceTo(targetPosRef.current);
const targetDistance = controlsRef.current.target.distanceTo(targetLookRef.current);

// Gentle animation that stops quickly
camera.position.lerp(targetPosRef.current, 0.05);
controlsRef.current.target.lerp(targetLookRef.current, 0.05);
controlsRef.current.update();

// Stop animating when close enough
if (distance < 1 && targetDistance < 1) {
animatingRef.current = false;
}
}
});

return (
<OrbitControls
ref={controlsRef}
makeDefault
enableDamping
dampingFactor={0.05}
minDistance={8}
maxDistance={40}
maxPolarAngle={Math.PI / 2.2}
enablePan={true}
enableRotate={true}
enableZoom={true}
// Detect user interaction to stop animation
onStart={() => { userInteractingRef.current = true; }}
onEnd={() => {
setTimeout(() => {
userInteractingRef.current = false;
}, 100);
}}
/>
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

// Pathfinding function to calculate route from help desk to room entrance
function calculatePathToRoom(roomPosition: [number, number, number], roomSize: [number, number, number]): [number, number, number][] {
	const helpDeskPos: [number, number, number] = [0, 0, 0];
	const [x, y, z] = roomPosition;
	const baseOffset = 13;
	const centralRadius = 8; // Radius of central area
	const pathHeight = 0.1; // Slightly above floor

	const path: [number, number, number][] = [];

	// Start at help desk
	path.push([helpDeskPos[0], pathHeight, helpDeskPos[2]]);

	// Determine which quadrant/side the room is on
	const absX = Math.abs(x);
	const absZ = Math.abs(z);

	// Room entrance is on the south side (front) of the room at z + roomSize[2]/2
	const entranceZ = z + roomSize[2] / 2;
	const entranceX = x;

	// If room is in central area (close to origin)
	if (absX < centralRadius && absZ < centralRadius) {
		// Direct path to room entrance
		path.push([entranceX, pathHeight, entranceZ - 1.5]); // Stop before door
	} else {
		// Room is on perimeter - need to navigate through corridors

		// Step 1: Exit central area toward the room's general direction
		let exitX = 0;
		let exitZ = 0;

		if (absX > absZ) {
			// Room is more to the left/right
			exitX = x > 0 ? centralRadius : -centralRadius;
			exitZ = 0;
		} else {
			// Room is more to the top/bottom
			exitX = 0;
			exitZ = z > 0 ? centralRadius : -centralRadius;
		}

		path.push([exitX, pathHeight, exitZ]);

		// Step 2: Navigate to the corridor nearest to the room
		// Determine if room is on a side (N/S/E/W) or corner
		const onNorthSide = Math.abs(z - (-baseOffset)) < 3;
		const onSouthSide = Math.abs(z - baseOffset) < 3;
		const onEastSide = Math.abs(x - baseOffset) < 3;
		const onWestSide = Math.abs(x - (-baseOffset)) < 3;

		if (onNorthSide || onSouthSide) {
			// Room is on north or south perimeter
			const corridorZ = z > 0 ? baseOffset : -baseOffset;

			// Move along the appropriate axis
			if (exitZ !== corridorZ) {
				path.push([exitX, pathHeight, corridorZ]);
			}

			// Move along corridor to room's X position
			if (exitX !== x) {
				path.push([x, pathHeight, corridorZ]);
			}

			// Move to room entrance
			path.push([entranceX, pathHeight, entranceZ - 1.5]);

		} else if (onEastSide || onWestSide) {
			// Room is on east or west perimeter
			const corridorX = x > 0 ? baseOffset : -baseOffset;

			// Move to corridor
			if (exitX !== corridorX) {
				path.push([corridorX, pathHeight, exitZ]);
			}

			// Move along corridor to room's Z position
			if (exitZ !== z) {
				path.push([corridorX, pathHeight, z]);
			}

			// Move to room entrance
			path.push([entranceX, pathHeight, entranceZ - 1.5]);

		} else {
			// Room is in a corner - navigate via two corridor segments
			let intermediateX = x > 0 ? baseOffset : -baseOffset;
			let intermediateZ = z > 0 ? baseOffset : -baseOffset;

			// Choose path based on exit direction
			if (Math.abs(exitX) > Math.abs(exitZ)) {
				// Exited horizontally - go X first, then Z
				path.push([intermediateX, pathHeight, exitZ]);
				path.push([intermediateX, pathHeight, intermediateZ]);
				path.push([entranceX, pathHeight, entranceZ - 1.5]);
			} else {
				// Exited vertically - go Z first, then X
				path.push([exitX, pathHeight, intermediateZ]);
				path.push([intermediateX, pathHeight, intermediateZ]);
				path.push([entranceX, pathHeight, entranceZ - 1.5]);
			}
		}
	}

	return path;
}

export function Hospital3DMap({ rooms, equipment, onRoomSelect, selectedRoomId, onEnterRoom, onCloseRoomPopup }: Hospital3DMapProps) {
// View mode state - 2D or 3D
const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');

// Default camera position (less aerial view) - memoized to prevent recreating on every render
const defaultCameraPosition = useMemo<[number, number, number]>(() => [0, 20, 28], []);
const defaultCameraLookAt = useMemo<[number, number, number]>(() => [0, 0, 0], []);

// Camera animation state
const [cameraTarget, setCameraTarget] = useState<{
position: [number, number, number];
lookAt: [number, number, number];
} | null>(null);


// Sort rooms and transform into 3D positions (memoized to prevent infinite loops)
const room3DData = useMemo(() => {
const sortedRooms = [...rooms].sort((a, b) => {
const aCentral = isCentralRoom(a);
const bCentral = isCentralRoom(b);
if (aCentral && !bCentral) return -1;
if (!aCentral && bCentral) return 1;
return 0;
});

return sortedRooms.map((room, index) => {
const position: [number, number, number] = getDefaultPosition(index);
return {
id: room.id,
position,
size: [3.2, 1.8, 3.2] as [number, number, number],
label: room.room_name || room.room_number,
roomData: room
};
});
}, [rooms]);

// Update camera when room is selected
useEffect(() => {
if (selectedRoomId) {
const selectedRoom = room3DData.find(r => r.id === selectedRoomId);
if (selectedRoom) {
const [x, y, z] = selectedRoom.position;
// Position camera above and in front of the room
setCameraTarget({
position: [x, y + 12, z + 12],
lookAt: [x, y, z]
});
}
} else {
// Reset to default view when no room selected
setCameraTarget({
position: defaultCameraPosition,
lookAt: defaultCameraLookAt
});
}
}, [selectedRoomId, room3DData, defaultCameraPosition, defaultCameraLookAt]);

// Handle popup close - reset camera to default
const handleClosePopup = () => {
setCameraTarget({
position: defaultCameraPosition,
lookAt: defaultCameraLookAt
});
if (onCloseRoomPopup) {
onCloseRoomPopup();
}
};


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

// 2D Map Component - uses same coordinates as 3D
const Map2D = () => {
	const scale = 15; // Scale factor to convert 3D coordinates to 2D pixels
	const offsetX = 400; // Center the map
	const offsetY = 400;

	const getStatusColor = (status: 'ready' | 'needs-attention' | 'occupied') => {
		switch (status) {
			case 'ready': return '#10b981';
			case 'needs-attention': return '#ef4444';
			case 'occupied': return '#f59e0b';
			default: return '#6b7280';
		}
	};

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
			<svg width="100%" height="100%" viewBox="0 0 800 800" style={{ background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }}>
				{/* Central area */}
				<rect
					x={offsetX - 16 * scale / 2}
					y={offsetY - 16 * scale / 2}
					width={16 * scale}
					height={16 * scale}
					fill="#9ca3af"
					opacity="0.3"
				/>

				{/* Help desk at center */}
				<circle
					cx={offsetX}
					cy={offsetY}
					r={20}
					fill="#374151"
					stroke="#1f2937"
					strokeWidth="2"
				/>
				<text
					x={offsetX}
					y={offsetY + 5}
					textAnchor="middle"
					fontSize="12"
					fill="white"
					fontWeight="600"
				>
					HELP
				</text>


				{/* Rooms */}
				{room3DData.map((room) => {
					const [x, , z] = room.position;
					const [width, , depth] = room.size;
					const status = getRoomStatus(room.id);
					const isSelected = selectedRoomId === room.id;

					return (
						<g key={room.id}>
							{/* Room rectangle */}
							<rect
								x={offsetX + (x - width / 2) * scale}
								y={offsetY + (z - depth / 2) * scale}
								width={width * scale}
								height={depth * scale}
								fill={isSelected ? getStatusColor(status) : '#e8f0f2'}
								stroke={getStatusColor(status)}
								strokeWidth={isSelected ? 3 : 2}
								opacity={isSelected ? 0.9 : 0.7}
								style={{ cursor: 'pointer' }}
								onClick={() => onRoomSelect(room.id)}
								onMouseEnter={(e) => {
									e.currentTarget.style.opacity = '1';
									e.currentTarget.style.strokeWidth = '3';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.opacity = isSelected ? '0.9' : '0.7';
									e.currentTarget.style.strokeWidth = isSelected ? '3' : '2';
								}}
							/>

							{/* Room label */}
							<text
								x={offsetX + x * scale}
								y={offsetY + z * scale}
								textAnchor="middle"
								fontSize="10"
								fill="#1f2937"
								fontWeight="600"
								pointerEvents="none"
							>
								{room.label}
							</text>

							{/* Status indicator dot */}
							<circle
								cx={offsetX + (x - width / 2 + 0.3) * scale}
								cy={offsetY + (z - depth / 2 + 0.3) * scale}
								r={4}
								fill={getStatusColor(status)}
							/>
						</g>
					);
				})}
			</svg>

			{/* Room details popup for 2D view */}
			{selectedRoomId && (
				<div style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					background: 'white',
					borderRadius: '12px',
					boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
					padding: '16px',
					minWidth: '250px',
					border: `3px solid ${getStatusColor(getRoomStatus(selectedRoomId))}`,
					zIndex: 1000
				}}>
					<button
						onClick={() => onCloseRoomPopup?.()}
						style={{
							position: 'absolute',
							top: '8px',
							right: '8px',
							background: 'transparent',
							border: 'none',
							cursor: 'pointer',
							fontSize: '20px',
							color: '#6b7280',
							padding: '4px',
							lineHeight: 1
						}}
					>
						×
					</button>

					<h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px', paddingRight: '24px' }}>
						{room3DData.find(r => r.id === selectedRoomId)?.label}
					</h3>

					<div style={{ marginBottom: '12px', fontSize: '12px' }}>
						<p style={{ fontWeight: '600', color: '#1f2937' }}>
							{rooms.find(r => r.id === selectedRoomId)?.room_name}
						</p>
						<p style={{ fontSize: '11px', color: '#6b7280' }}>
							Status: {rooms.find(r => r.id === selectedRoomId)?.status} •
							Type: {rooms.find(r => r.id === selectedRoomId)?.room_type}
							{rooms.find(r => r.id === selectedRoomId)?.floor && ` • Floor ${rooms.find(r => r.id === selectedRoomId)?.floor}`}
						</p>
					</div>

					<button
						onClick={(e) => {
							e.stopPropagation();
							onEnterRoom?.(selectedRoomId);
						}}
						style={{
							width: '100%',
							padding: '8px 16px',
							background: '#10b981',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '13px',
							fontWeight: '600',
							cursor: 'pointer'
						}}
					>
						🔍 Enter Room (3D View)
					</button>
				</div>
			)}
		</div>
	);
};

return (
<div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)' }}>
{/* Render 2D or 3D based on view mode */}
{viewMode === '2D' ? (
<Map2D />
) : (
<Suspense fallback={<LoadingFallback />}>
<Canvas shadows camera={{ position: defaultCameraPosition, fov: 60 }}>
{/* Lighting */}
<ambientLight intensity={0.4} />
<directionalLight
position={[10, 10, 5]}
intensity={1}
castShadow
shadow-mapSize={[2048, 2048]}
/>
<hemisphereLight args={['#87ceeb', '#f0e68c', 0.6]} />

{/* Camera Controller with smooth animations */}
<CameraController
targetPosition={cameraTarget?.position || defaultCameraPosition}
targetLookAt={cameraTarget?.lookAt || defaultCameraLookAt}
selectedRoomId={selectedRoomId}
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
onClosePopup={handleClosePopup}
/>
))}

</Canvas>
</Suspense>
)}

{/* Compact Transparent Header */}
<div style={{
position: 'absolute',
top: '20px',
left: '50%',
transform: 'translateX(-50%)',
background: 'rgba(255, 255, 255, 0.15)',
backdropFilter: 'blur(12px)',
border: '1px solid rgba(255, 255, 255, 0.3)',
borderRadius: '24px',
padding: '16px 20px',
display: 'flex',
flexDirection: 'column',
alignItems: 'center',
gap: '12px',
boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
zIndex: 10,
pointerEvents: 'none'
}}>
<h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: 0, textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Ward Overview</h3>
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<div style={{
width: '10px',
height: '10px',
borderRadius: '50%',
background: '#10b981',
boxShadow: '0 2px 4px rgba(16, 185, 129, 0.4)'
}}></div>
<span style={{ color: '#1f2937', fontSize: '11px', fontWeight: '600', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Ready</span>
</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<div style={{
width: '10px',
height: '10px',
borderRadius: '50%',
background: '#f59e0b',
boxShadow: '0 2px 4px rgba(245, 158, 11, 0.4)'
}}></div>
<span style={{ color: '#1f2937', fontSize: '11px', fontWeight: '600', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Occupied</span>
</div>
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
<div style={{
width: '10px',
height: '10px',
borderRadius: '50%',
background: '#ef4444',
boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
}}></div>
<span style={{ color: '#1f2937', fontSize: '11px', fontWeight: '600', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>Needs Attention</span>
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

{/* Bottom Left Controls */}
<div style={{
position: 'absolute',
bottom: '16px',
left: '16px',
display: 'flex',
gap: '12px',
alignItems: 'center',
zIndex: 10
}}>
{/* Sliding Toggle Switch for 2D/3D */}
<div style={{
position: 'relative',
background: 'rgba(255, 255, 255, 0.95)',
borderRadius: '12px',
padding: '4px',
display: 'flex',
boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
backdropFilter: 'blur(8px)',
border: '1px solid rgba(0,0,0,0.1)'
}}>
{/* Sliding background */}
<div style={{
position: 'absolute',
top: '4px',
left: viewMode === '2D' ? '4px' : 'calc(50%)',
width: 'calc(50% - 4px)',
height: 'calc(100% - 8px)',
background: '#10b981',
borderRadius: '8px',
transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
zIndex: 0
}} />

{/* 2D Option */}
<button
onClick={() => setViewMode('2D')}
style={{
position: 'relative',
zIndex: 1,
background: 'transparent',
border: 'none',
borderRadius: '8px',
padding: '8px 20px',
fontSize: '13px',
fontWeight: '600',
cursor: 'pointer',
color: viewMode === '2D' ? 'white' : '#6b7280',
transition: 'color 0.3s ease',
minWidth: '60px'
}}
>
2D
</button>

{/* 3D Option */}
<button
onClick={() => setViewMode('3D')}
style={{
position: 'relative',
zIndex: 1,
background: 'transparent',
border: 'none',
borderRadius: '8px',
padding: '8px 20px',
fontSize: '13px',
fontWeight: '600',
cursor: 'pointer',
color: viewMode === '3D' ? 'white' : '#6b7280',
transition: 'color 0.3s ease',
minWidth: '60px'
}}
>
3D
</button>
</div>

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