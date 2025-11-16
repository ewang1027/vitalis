import React from 'react';
import { MeshProps } from '@react-three/fiber';

interface HospitalBedProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function HospitalBed({ position, onClick, hovered }: HospitalBedProps) {
  const bedColor = hovered ? '#4a90e2' : '#3b82f6';
  const frameColor = '#8a8a8a';
  const mattressColor = '#f5f5f5';
  const sheetColor = '#e8f4f8';

  return (
    <group position={position} onClick={onClick}>
      {/* Bed Frame Base */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[2, 0.1, 2.8]} />
        <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Mattress */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.9, 0.3, 1.7]} />
        <meshStandardMaterial color={mattressColor} roughness={0.8} />
      </mesh>

      {/* Top Sheet/Blanket */}
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[1.85, 0.05, 1.65]} />
        <meshStandardMaterial color={sheetColor} roughness={0.6} />
      </mesh>

      {/* Headboard */}
      <mesh position={[0, 0.7, -0.9]} castShadow>
        <boxGeometry args={[2, 0.8, 0.08]} />
        <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Footboard */}
      <mesh position={[0, 0.4, 0.9]} castShadow>
        <boxGeometry args={[2, 0.4, 0.08]} />
        <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Left Side Rail */}
      <group position={[-0.95, 0.65, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.4, 1.7]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Rail support posts */}
        <mesh position={[0, -0.2, -0.8]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.2, 0.8]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Side Rail */}
      <group position={[0.95, 0.65, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.4, 1.7]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Rail support posts */}
        <mesh position={[0, -0.2, -0.8]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.2, 0.8]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Wheels/Casters (4 corners) */}
      {[
        [-0.9, 0.06, -0.85],
        [0.9, 0.06, -0.85],
        [-0.9, 0.06, 0.85],
        [0.9, 0.06, 0.85],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          {/* Wheel */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
            <meshStandardMaterial color="#333333" roughness={0.7} />
          </mesh>
          {/* Wheel mount */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Pillow */}
      <mesh position={[0, 0.62, -0.7]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.1, 0.8, 1.9]} />
          <meshStandardMaterial
            color={bedColor}
            transparent
            opacity={0.2}
            emissive={bedColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
