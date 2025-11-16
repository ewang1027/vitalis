import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TaskWithAnimation } from '../hooks/useTaskSubscription';
import { TASK_CONFIGS } from '../types/visualTasks';
import { generateAIVisuals, AIVisualParams } from '../services/aiVisualGenerator';

interface RoomTaskIndicatorProps {
  task: TaskWithAnimation;
  roomPosition: [number, number, number];
}

export function RoomTaskIndicator({ task, roomPosition }: RoomTaskIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const iconMeshRef = useRef<THREE.Mesh>(null);
  const [aiVisuals, setAiVisuals] = useState<AIVisualParams | null>(null);
  const taskConfig = TASK_CONFIGS[task.type];

  // Generate AI-powered visual parameters
  useEffect(() => {
    const loadVisuals = async () => {
      const visuals = await generateAIVisuals(task);
      setAiVisuals(visuals);
    };
    loadVisuals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.type, task.priority]);

  // Animate the task indicator with AI-driven parameters
  useFrame((state) => {
    if (groupRef.current && aiVisuals) {
      // AI-controlled floating animation
      const floatSpeed = aiVisuals.animationSpeed * 2;
      const floatAmount = aiVisuals.animationStyle === 'bouncy' ? 0.5 : 0.3;
      groupRef.current.position.y = roomPosition[1] + 3 + Math.sin(state.clock.elapsedTime * floatSpeed) * floatAmount;

      // AI-controlled rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * aiVisuals.rotationSpeed;
    }

    // Pulse the icon with AI intensity
    if (iconMeshRef.current && iconMeshRef.current.material && aiVisuals) {
      const material = iconMeshRef.current.material as THREE.MeshStandardMaterial;

      if (aiVisuals.hasPulse) {
        const pulseSpeed = aiVisuals.urgencyLevel * 0.3;
        const pulse = 0.8 + Math.sin(state.clock.elapsedTime * (3 + pulseSpeed)) * 0.2;
        material.emissiveIntensity = pulse * aiVisuals.glowIntensity;
      } else {
        material.emissiveIntensity = aiVisuals.glowIntensity;
      }

      // Fade out when task completes
      if (task.status === 'completed') {
        material.opacity = Math.max(0, 1 - task.progress / 100);
      }
    }
  });

  // Don't render until AI visuals are loaded
  if (!aiVisuals) {
    return null;
  }

  const primaryColor = aiVisuals.primaryColor;
  const secondaryColor = aiVisuals.secondaryColor;

  return (
    <group ref={groupRef} position={[roomPosition[0], roomPosition[1] + 3, roomPosition[2]]}>
      {/* Background circle with progress ring - AI colored */}
      <mesh>
        <ringGeometry args={[0.8 * aiVisuals.iconSize, 1.0 * aiVisuals.iconSize, 32, 1, 0, (task.progress / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={aiVisuals.glowIntensity * 0.6}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Icon background disc - AI styled */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.7 * aiVisuals.iconSize, 32]} />
        <meshStandardMaterial
          color={secondaryColor}
          emissive={secondaryColor}
          emissiveIntensity={aiVisuals.glowIntensity * 0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Icon - AI customized */}
      <mesh ref={iconMeshRef} position={[0, 0, 0.02]}>
        <planeGeometry args={[1.2 * aiVisuals.iconSize, 1.2 * aiVisuals.iconSize]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={aiVisuals.glowIntensity}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
        >
          <primitive attach="map" object={createIconTexture(aiVisuals.icon)} />
        </meshStandardMaterial>
      </mesh>

      {/* AI-controlled pulsing glow effect */}
      {aiVisuals.hasGlow && (
        <pointLight
          position={[0, 0, 0.5]}
          color={primaryColor}
          intensity={aiVisuals.glowIntensity * 1.5}
          distance={5 + aiVisuals.urgencyLevel * 0.3}
          decay={2}
        />
      )}

      {/* AI-controlled particle effects */}
      {aiVisuals.particleCount > 0 && task.status === 'in_progress' && (
        <RoomParticles
          color={secondaryColor}
          count={aiVisuals.particleCount}
          style={aiVisuals.particleStyle}
        />
      )}
    </group>
  );
}

// AI-Controlled Room Particle effect
function RoomParticles({ color, count, style }: { color: string; count: number; style: string }) {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      // Rotation based on style
      if (style === 'sparkles') {
        particlesRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      } else if (style === 'smoke') {
        particlesRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      }

      // Update particle positions based on style
      const positions = particlesRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;

        if (style === 'sparkles') {
          positions.array[i3 + 1] = Math.sin(state.clock.elapsedTime * 2 + i) * 0.5;
        } else if (style === 'smoke') {
          positions.array[i3 + 1] += 0.01; // Rise upward
          if (positions.array[i3 + 1] > 2) {
            positions.array[i3 + 1] = -0.5; // Reset
          }
        } else if (style === 'dots') {
          positions.array[i3 + 1] = Math.sin(state.clock.elapsedTime + i) * 0.3;
        }
      }
      positions.needsUpdate = true;
    }
  });

  // Create particle positions based on count
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const angle = (i / count) * Math.PI * 2;
    const radius = 1.5;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.random() - 0.5) * 2;
    positions[i3 + 2] = Math.sin(angle) * radius;
  }

  const particleSize = style === 'sparkles' ? 0.2 : style === 'smoke' ? 0.3 : 0.15;
  const particleOpacity = style === 'smoke' ? 0.3 : 0.6;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        color={color}
        transparent
        opacity={particleOpacity}
        sizeAttenuation
      />
    </points>
  );
}

// Helper function to create texture from emoji icon
function createIconTexture(icon: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Component to render all room-based task indicators
interface RoomTaskIndicatorsProps {
  tasks: TaskWithAnimation[];
  getRoomPosition: (roomId: string) => [number, number, number] | undefined;
}

export function RoomTaskIndicators({ tasks, getRoomPosition }: RoomTaskIndicatorsProps) {
  // Filter for tasks that don't require source room (room-based tasks)
  const roomBasedTasks = tasks.filter(task => {
    const config = TASK_CONFIGS[task.type];
    return !config.requiresSourceRoom;
  });

  return (
    <>
      {roomBasedTasks.map((task) => {
        const position = getRoomPosition(task.targetRoomId);
        if (!position) return null;

        return (
          <RoomTaskIndicator
            key={task.id}
            task={task}
            roomPosition={position}
          />
        );
      })}
    </>
  );
}
