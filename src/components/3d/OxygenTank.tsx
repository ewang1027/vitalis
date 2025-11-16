import React from 'react';

interface OxygenTankProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function OxygenTank({ position, onClick, hovered }: OxygenTankProps) {
  const tankColor = hovered ? '#14f195' : '#10b981';

  return (
    <group position={position} onClick={onClick}>
      {/* Wheeled Cart Base */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cart wheels (4) */}
      {[
        [0.18, 0.04, 0.18],
        [-0.18, 0.04, 0.18],
        [0.18, 0.04, -0.18],
        [-0.18, 0.04, -0.18],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#222222" roughness={0.8} />
        </mesh>
      ))}

      {/* Support pole from cart to tank */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main Oxygen Tank Cylinder */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.3, 24]} />
        <meshStandardMaterial
          color={tankColor}
          metalness={0.8}
          roughness={0.2}
          emissive={hovered ? tankColor : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      {/* Tank top cap */}
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={tankColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Valve assembly on top */}
      <group position={[0, 1.9, 0]}>
        {/* Valve body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.15, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Valve handle */}
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
          <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Pressure gauge */}
      <group position={[0.12, 1.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        {/* Gauge face */}
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.03, 16]} />
          <meshStandardMaterial color="#f0f0f0" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Gauge glass */}
        <mesh position={[0, 0.016, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.005, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        {/* Connection hose */}
        <mesh position={[-0.06, -0.08, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
          <meshStandardMaterial color="#555555" roughness={0.6} />
        </mesh>
      </group>

      {/* Warning label/stripe */}
      <mesh position={[0, 1.5, 0.151]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.002]} />
        <meshStandardMaterial color="#ffcc00" roughness={0.7} />
      </mesh>

      {/* Medical cross symbol on label */}
      <group position={[0, 1.5, 0.153]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.02, 0.001]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.02, 0.08, 0.001]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      </group>

      {/* Regulator/Flow meter */}
      <group position={[0, 1.0, 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.15, 0.05]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Flow meter dial */}
        <mesh position={[0, 0.05, 0.026]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.01, 12]} />
          <meshStandardMaterial color="#34495e" />
        </mesh>
      </group>

      {/* Holder straps */}
      <mesh position={[0, 1.15, 0.16]} castShadow>
        <torusGeometry args={[0.17, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0.16]} rotation={[Math.PI, 0, 0]} castShadow>
        <torusGeometry args={[0.17, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 2, 16]} />
          <meshStandardMaterial
            color={tankColor}
            transparent
            opacity={0.15}
            emissive={tankColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
