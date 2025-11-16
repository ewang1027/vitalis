import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TASK_CONFIGS } from '../types/visualTasks';
import { TaskWithAnimation } from '../hooks/useTaskSubscription';

interface RoomHighlightProps {
  position: [number, number, number];
  size: [number, number, number];
  task: TaskWithAnimation;
}

export function RoomHighlight({ position, size, task }: RoomHighlightProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const taskConfig = TASK_CONFIGS[task.type];

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Pulsing ring animation
    if (ringRef.current) {
      const pulseScale = 1 + Math.sin(time * 3) * 0.1;
      ringRef.current.scale.set(pulseScale, 1, pulseScale);

      // Rotate the ring
      ringRef.current.rotation.y += 0.02;

      // Fade based on task progress
      if (ringRef.current.material instanceof THREE.MeshStandardMaterial) {
        ringRef.current.material.opacity = task.status === 'completed' ? 0.3 : 0.7;
      }
    }

    // Pulsing glow effect
    if (glowRef.current && glowRef.current.material instanceof THREE.MeshStandardMaterial) {
      const glowIntensity = 0.3 + Math.sin(time * 4) * 0.2;
      glowRef.current.material.emissiveIntensity = glowIntensity;
      glowRef.current.material.opacity = task.status === 'completed' ? 0.2 : 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Floor ring highlight */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[Math.max(size[0], size[2]) * 0.8, Math.max(size[0], size[2]) * 1.1, 32]} />
        <meshStandardMaterial
          color={taskConfig.color}
          emissive={taskConfig.color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical glow beam */}
      <mesh ref={glowRef} position={[0, size[1] / 2, 0]}>
        <cylinderGeometry args={[Math.max(size[0], size[2]) * 0.6, Math.max(size[0], size[2]) * 0.6, size[1], 32, 1, true]} />
        <meshStandardMaterial
          color={taskConfig.color}
          emissive={taskConfig.color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Corner markers */}
      {[
        [size[0] / 2, 0, size[2] / 2],
        [-size[0] / 2, 0, size[2] / 2],
        [size[0] / 2, 0, -size[2] / 2],
        [-size[0] / 2, 0, -size[2] / 2],
      ].map((cornerPos, i) => (
        <mesh key={i} position={cornerPos as [number, number, number]}>
          <cylinderGeometry args={[0.1, 0.15, size[1] * 1.2, 6]} />
          <meshStandardMaterial
            color={taskConfig.color}
            emissive={taskConfig.color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}

      {/* Task progress bar above room */}
      <group position={[0, size[1] + 1, 0]}>
        {/* Background bar */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[size[0] * 0.8, 0.1, 0.3]} />
          <meshStandardMaterial color="#333333" transparent opacity={0.7} />
        </mesh>

        {/* Progress fill */}
        <mesh position={[-(size[0] * 0.8) / 2 + (size[0] * 0.8 * task.progress) / 200, 0, 0]}>
          <boxGeometry args={[(size[0] * 0.8 * task.progress) / 100, 0.12, 0.32]} />
          <meshStandardMaterial
            color={taskConfig.color}
            emissive={taskConfig.color}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Progress percentage text */}
        <mesh position={[0, 0.5, 0]}>
          <planeGeometry args={[2, 0.8]} />
          <meshBasicMaterial
            color={taskConfig.color}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Point light for additional glow */}
      <pointLight
        position={[0, size[1] / 2, 0]}
        color={taskConfig.color}
        intensity={1.5}
        distance={Math.max(size[0], size[2]) * 2}
        decay={2}
      />
    </group>
  );
}

// Component to manage all room highlights
interface RoomHighlightsProps {
  tasks: TaskWithAnimation[];
  getRoomLayout: (roomId: string) => {
    position: [number, number, number];
    size: [number, number, number];
  } | undefined;
}

export function RoomHighlights({ tasks, getRoomLayout }: RoomHighlightsProps) {
  return (
    <>
      {tasks.map((task) => {
        const layout = getRoomLayout(task.targetRoomId);
        if (!layout) return null;

        return (
          <RoomHighlight
            key={task.id}
            position={layout.position}
            size={layout.size}
            task={task}
          />
        );
      })}
    </>
  );
}
