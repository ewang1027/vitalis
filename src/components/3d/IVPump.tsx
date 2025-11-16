import React from 'react';

interface IVPumpProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function IVPump({ position, onClick, hovered }: IVPumpProps) {
  const pumpColor = hovered ? '#fb923c' : '#f59e0b';

  return (
    <group position={position} onClick={onClick}>
      {/* Wheeled base */}
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.05, 16]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Base wheels (5 caster wheels in star pattern) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.cos(angle) * 0.22;
        const z = Math.sin(angle) * 0.22;
        return (
          <mesh
            key={i}
            position={[x, 0.04, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
        );
      })}

      {/* Main pole */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 2, 12]} />
        <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pole sections (cosmetic rings) */}
      {[0.5, 1.0, 1.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
          <meshStandardMaterial color="#666666" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Pump control unit/display */}
      <group position={[0, 1.3, 0]}>
        {/* Main unit body */}
        <mesh castShadow>
          <boxGeometry args={[0.25, 0.35, 0.1]} />
          <meshStandardMaterial
            color={pumpColor}
            metalness={0.4}
            roughness={0.6}
            emissive={hovered ? pumpColor : '#000000'}
            emissiveIntensity={hovered ? 0.2 : 0}
          />
        </mesh>

        {/* Display screen */}
        <mesh position={[0, 0.08, 0.051]} castShadow>
          <boxGeometry args={[0.2, 0.15, 0.005]} />
          <meshStandardMaterial color="#0a3d2e" emissive="#00ff88" emissiveIntensity={0.3} />
        </mesh>

        {/* Control buttons (3 rows of 2) */}
        {[-0.08, 0, 0.08].map((y, row) =>
          [-0.06, 0.06].map((x, col) => (
            <mesh key={`${row}-${col}`} position={[x, y - 0.08, 0.051]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.01, 12]} />
              <meshStandardMaterial color="#2c3e50" />
            </mesh>
          ))
        )}

        {/* Side handle */}
        <mesh position={[-0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.04, 0.01, 8, 12]} />
          <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* IV bag hook at top */}
      <group position={[0, 1.95, 0]}>
        {/* Hook base */}
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
          <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Hook arm */}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.08, 0.015, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* IV Bag hanging from hook */}
      <group position={[0, 1.75, 0]}>
        {/* Bag body */}
        <mesh castShadow>
          <boxGeometry args={[0.15, 0.25, 0.03]} />
          <meshStandardMaterial
            color="#e8f5e9"
            transparent
            opacity={0.7}
            roughness={0.2}
          />
        </mesh>
        {/* Fluid inside bag */}
        <mesh position={[0, -0.03, 0]} castShadow>
          <boxGeometry args={[0.14, 0.18, 0.025]} />
          <meshStandardMaterial
            color="#81c784"
            transparent
            opacity={0.5}
            emissive="#4caf50"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Bag port/cap at top */}
        <mesh position={[0, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.04, 8]} />
          <meshStandardMaterial color="#2196f3" />
        </mesh>
        {/* Hanging tab */}
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[0.04, 0.03, 0.01]} />
          <meshStandardMaterial color="#ffffff" opacity={0.8} transparent />
        </mesh>
      </group>

      {/* Tubing from bag */}
      <group>
        {/* Drip chamber */}
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.015, 0.08, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.6}
            roughness={0.2}
          />
        </mesh>
        {/* Main tubing (simplified as straight tube) */}
        <mesh position={[0.05, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.7, 8]} />
          <meshStandardMaterial color="#90caf9" transparent opacity={0.7} />
        </mesh>
        {/* Roller clamp */}
        <mesh position={[0.05, 0.9, 0]} castShadow>
          <boxGeometry args={[0.03, 0.06, 0.02]} />
          <meshStandardMaterial color="#ff9800" />
        </mesh>
      </group>

      {/* Pump motor housing on pole */}
      <group position={[0.1, 1.3, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.15, 12]} />
          <meshStandardMaterial color="#607d8b" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[0.4, 0.5, 0.3]} />
          <meshStandardMaterial
            color={pumpColor}
            transparent
            opacity={0.15}
            emissive={pumpColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
