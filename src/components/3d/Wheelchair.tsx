import React from 'react';

interface WheelchairProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function Wheelchair({ position, onClick, hovered }: WheelchairProps) {
  const chairColor = hovered ? '#a78bfa' : '#8b5cf6';

  return (
    <group position={position} onClick={onClick}>
      {/* Seat frame */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.45, 0.05, 0.4]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Seat cushion */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.43, 0.08, 0.38]} />
        <meshStandardMaterial color={chairColor} roughness={0.8} />
      </mesh>

      {/* Backrest frame */}
      <mesh position={[0, 0.75, -0.19]} castShadow>
        <boxGeometry args={[0.45, 0.6, 0.05]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Backrest padding */}
      <mesh position={[0, 0.75, -0.17]} castShadow>
        <boxGeometry args={[0.43, 0.56, 0.06]} />
        <meshStandardMaterial color={chairColor} roughness={0.8} />
      </mesh>

      {/* Armrests (left and right) */}
      {[-0.25, 0.25].map((x, i) => (
        <group key={i} position={[x, 0.55, 0]}>
          {/* Armrest pad */}
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.06, 0.35]} />
            <meshStandardMaterial color={chairColor} roughness={0.7} />
          </mesh>
          {/* Armrest support - front */}
          <mesh position={[0, -0.15, 0.15]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Armrest support - back */}
          <mesh position={[0, -0.15, -0.15]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Main wheels (large rear wheels) */}
      {[-0.23, 0.23].map((x, i) => (
        <group key={i} position={[x, 0.3, 0]}>
          {/* Main wheel */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 24]} />
            <meshStandardMaterial color="#1a202c" roughness={0.6} />
          </mesh>
          {/* Wheel rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.25, 0.015, 12, 24]} />
            <meshStandardMaterial color="#718096" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Wheel spokes (8) */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((spoke) => {
            const angle = (spoke * Math.PI) / 4;
            return (
              <mesh
                key={spoke}
                position={[
                  i === 0 ? -0.025 : 0.025,
                  Math.cos(angle) * 0.15,
                  Math.sin(angle) * 0.15,
                ]}
                rotation={[0, Math.PI / 2, angle]}
                castShadow
              >
                <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
                <meshStandardMaterial color="#4a5568" metalness={0.6} roughness={0.4} />
              </mesh>
            );
          })}
          {/* Hand rim for pushing */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[i === 0 ? -0.04 : 0.04, 0, 0]}>
            <torusGeometry args={[0.32, 0.012, 10, 24]} />
            <meshStandardMaterial color="#a0aec0" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Hub */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
            <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Front caster wheels */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={i} position={[x, 0.08, 0.35]}>
          {/* Caster fork */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.1, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Caster wheel */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
            <meshStandardMaterial color="#2d3748" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Footrests */}
      {[-0.18, 0.18].map((x, i) => (
        <group key={i} position={[x, 0.15, 0.3]}>
          {/* Footrest support leg */}
          <mesh rotation={[Math.PI / 6, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Footrest plate */}
          <mesh position={[0, -0.12, 0.15]} rotation={[-Math.PI / 3, 0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.15, 0.02]} />
            <meshStandardMaterial color="#2d3748" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Push handles at back */}
      {[-0.2, 0.2].map((x, i) => (
        <group key={i} position={[x, 0.95, -0.2]}>
          {/* Handle grip */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 12]} />
            <meshStandardMaterial color="#1a202c" roughness={0.6} />
          </mesh>
          {/* Handle extension down */}
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Cross brace under seat */}
      <mesh position={[0, 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.6, 0.02, 0.02]} />
        <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[0, -Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.6, 0.02, 0.02]} />
        <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Anti-tip bars at back */}
      {[-0.2, 0.2].map((x, i) => (
        <group key={i} position={[x, 0.15, -0.3]}>
          <mesh rotation={[Math.PI / 6, 0, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.06, -0.06]} castShadow>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshStandardMaterial color="#1a202c" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Brake levers */}
      {[-0.23, 0.23].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 0.25]} rotation={[Math.PI / 3, 0, 0]} castShadow>
          <boxGeometry args={[0.03, 0.12, 0.02]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      ))}

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.7, 1, 0.7]} />
          <meshStandardMaterial
            color={chairColor}
            transparent
            opacity={0.15}
            emissive={chairColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
