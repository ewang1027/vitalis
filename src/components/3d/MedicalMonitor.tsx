import React from 'react';

interface MedicalMonitorProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function MedicalMonitor({ position, onClick, hovered }: MedicalMonitorProps) {
  const monitorColor = hovered ? '#22c55e' : '#10b981';

  return (
    <group position={position} onClick={onClick}>
      {/* Rolling cart base */}
      <mesh position={[0, 0.115, 0]} castShadow>
        <boxGeometry args={[0.4, 0.15, 0.35]} />
        <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Cart wheels (4) */}
      {[
        [-0.18, 0.04, 0.16],
        [0.18, 0.04, 0.16],
        [-0.18, 0.04, -0.16],
        [0.18, 0.04, -0.16],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#2d3748" roughness={0.8} />
        </mesh>
      ))}

      {/* Articulating arm mount pole */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.65, 12]} />
        <meshStandardMaterial color="#718096" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Joint/pivot point */}
      <mesh position={[0, 0.83, 0]} castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#4a5568" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Arm extending to monitor */}
      <mesh position={[0.15, 0.83, 0]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#718096" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Monitor housing */}
      <group position={[0.3, 0.83, 0]}>
        {/* Main monitor body */}
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.35, 0.08]} />
          <meshStandardMaterial
            color={monitorColor}
            metalness={0.4}
            roughness={0.6}
            emissive={hovered ? monitorColor : '#000000'}
            emissiveIntensity={hovered ? 0.2 : 0}
          />
        </mesh>

        {/* Screen */}
        <mesh position={[0, 0.02, 0.041]} castShadow>
          <boxGeometry args={[0.4, 0.25, 0.005]} />
          <meshStandardMaterial
            color="#0a1f1a"
            emissive="#00ff88"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* ECG waveform on screen (simplified) */}
        <group position={[0, 0.02, 0.044]}>
          <mesh position={[-0.1, 0, 0]}>
            <boxGeometry args={[0.15, 0.002, 0.001]} />
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0.05, 0.03, 0]}>
            <boxGeometry args={[0.002, 0.06, 0.001]} />
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
          </mesh>
        </group>

        {/* Vital signs display area */}
        <group position={[0.15, 0.08, 0.044]}>
          {/* HR reading */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.03, 0.001]} />
            <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.5} />
          </mesh>
          {/* SpO2 reading */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.03, 0.001]} />
            <meshStandardMaterial color="#3399ff" emissive="#3399ff" emissiveIntensity={0.5} />
          </mesh>
          {/* BP reading */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.08, 0.03, 0.001]} />
            <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Control panel below screen */}
        <mesh position={[0, -0.15, 0.041]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.005]} />
          <meshStandardMaterial color="#2d3748" />
        </mesh>

        {/* Control buttons */}
        {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
          <mesh key={i} position={[x, -0.15, 0.044]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
            <meshStandardMaterial color={i === 0 ? '#ef4444' : '#4a5568'} />
          </mesh>
        ))}

        {/* Side vents */}
        {[-0.2, -0.18, -0.16].map((y, i) => (
          <mesh key={i} position={[-0.22, y, 0]} castShadow>
            <boxGeometry args={[0.005, 0.015, 0.06]} />
            <meshStandardMaterial color="#1a202c" />
          </mesh>
        ))}

        {/* Power indicator LED */}
        <mesh position={[0.18, -0.15, 0.044]} castShadow>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshStandardMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Speaker grille */}
        <group position={[-0.15, -0.08, 0.041]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[i * 0.012 - 0.024, 0, 0]} castShadow>
              <boxGeometry args={[0.008, 0.04, 0.002]} />
              <meshStandardMaterial color="#1a202c" />
            </mesh>
          ))}
        </group>
      </group>

      {/* Cable management on back of monitor */}
      <mesh position={[0.3, 0.83, -0.05]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
        <meshStandardMaterial color="#2d3748" roughness={0.7} />
      </mesh>

      {/* Accessory drawer in cart */}
      <mesh position={[0, 0.13, 0.15]} castShadow>
        <boxGeometry args={[0.35, 0.06, 0.25]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
      <mesh position={[0, 0.13, 0.28]} castShadow>
        <boxGeometry args={[0.08, 0.015, 0.01]} />
        <meshStandardMaterial color="#718096" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Sensor cables hanging from side */}
      <group position={[0.5, 0.7, 0]}>
        {/* ECG leads */}
        <mesh rotation={[0, 0, Math.PI / 6]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 8]} />
          <meshStandardMaterial color="#ff6b6b" roughness={0.6} />
        </mesh>
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 8]} />
          <meshStandardMaterial color="#4ecdc4" roughness={0.6} />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 8]} />
          <meshStandardMaterial color="#ffe66d" roughness={0.6} />
        </mesh>
      </group>

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0.3, 0.83, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.2]} />
          <meshStandardMaterial
            color={monitorColor}
            transparent
            opacity={0.15}
            emissive={monitorColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
