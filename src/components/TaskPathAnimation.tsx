import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TaskWithAnimation } from '../hooks/useTaskSubscription';
import { TASK_CONFIGS } from '../types/visualTasks';
import { generateAIVisuals, AIVisualParams } from '../services/aiVisualGenerator';

interface TaskPathAnimationProps {
  task: TaskWithAnimation;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
}

export function TaskPathAnimation({ task, sourcePosition, targetPosition }: TaskPathAnimationProps) {
  const lineRef = useRef<THREE.Line>(null);
  const progressRef = useRef(0);
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

  // Create curved path between source and target with AI-driven curvature
  const pathPoints = useMemo(() => {
    const start = new THREE.Vector3(...sourcePosition);
    const end = new THREE.Vector3(...targetPosition);

    // Calculate midpoint and add height for arc (AI-controlled curvature)
    const midpoint = start.clone().lerp(end, 0.5);
    const distance = start.distanceTo(end);
    const curvature = aiVisuals?.pathCurvature ?? 0.3;
    midpoint.y += distance * (0.1 + curvature * 0.4); // AI controls arc height

    // Create quadratic bezier curve
    const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);

    // Get points along the curve (more points for smoother urgent tasks)
    const pointCount = aiVisuals?.urgencyLevel ? 30 + aiVisuals.urgencyLevel * 2 : 50;
    return curve.getPoints(pointCount);
  }, [sourcePosition, targetPosition, aiVisuals?.pathCurvature, aiVisuals?.urgencyLevel]);

  // Animate the dotted line dash offset with AI-driven speed
  useFrame((state) => {
    if (lineRef.current && lineRef.current.material) {
      // Animate dash offset with AI-controlled speed
      const speed = (aiVisuals?.animationSpeed ?? 1) * 0.02;
      lineRef.current.material.dashOffset -= speed;

      // Update opacity based on task progress
      const fadeIn = Math.min(task.progress / 10, 1); // Fade in during first 10%
      const fadeOut = task.status === 'completed' ? Math.max(0, 1 - task.progress / 100) : 1;
      lineRef.current.material.opacity = fadeIn * fadeOut * 0.8;
    }

    progressRef.current = task.progress;
  });

  // Convert path points to array format
  const points = pathPoints.map((p) => [p.x, p.y, p.z] as [number, number, number]);

  // Use AI-generated colors or fallback to task config
  const primaryColor = aiVisuals?.primaryColor ?? taskConfig.color;
  const secondaryColor = aiVisuals?.secondaryColor ?? taskConfig.color;
  const glowIntensity = aiVisuals?.glowIntensity ?? 0.8;
  const lineWidth = aiVisuals?.pathThickness ?? 3;

  // Don't render until AI visuals are loaded
  if (!aiVisuals) {
    return null; // Loading AI visuals...
  }

  return (
    <group>
      {/* Dotted path line with AI colors */}
      <Line
        ref={lineRef}
        points={points}
        color={primaryColor}
        lineWidth={lineWidth}
        dashed
        dashScale={20}
        dashSize={0.5}
        gapSize={0.5}
        transparent
        opacity={0.8}
      />

      {/* Moving task indicator sphere with AI styling */}
      <mesh position={pathPoints[Math.floor((task.progress / 100) * (pathPoints.length - 1))].toArray()}>
        <sphereGeometry args={[0.3 * (aiVisuals.iconSize ?? 1), 16, 16]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={glowIntensity}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Task icon/label at moving position with AI icon */}
      <group position={pathPoints[Math.floor((task.progress / 100) * (pathPoints.length - 1))].toArray()}>
        <mesh position={[0, 0.8, 0]}>
          <planeGeometry args={[aiVisuals.iconSize ?? 1, aiVisuals.iconSize ?? 1]} />
          <meshBasicMaterial
            color={primaryColor}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.81, 0]}>
          <planeGeometry args={[0.8 * (aiVisuals.iconSize ?? 1), 0.8 * (aiVisuals.iconSize ?? 1)]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide}>
            <primitive attach="map" object={createIconTexture(aiVisuals.icon ?? taskConfig.icon)} />
          </meshBasicMaterial>
        </mesh>
      </group>

      {/* AI-controlled glow effect at target position */}
      {aiVisuals.hasGlow && task.progress > 80 && (
        <pointLight
          position={targetPosition}
          color={primaryColor}
          intensity={glowIntensity * 2}
          distance={5 + aiVisuals.urgencyLevel * 0.5}
          decay={2}
        />
      )}

      {/* AI-controlled particle trail */}
      {aiVisuals.hasTrail && aiVisuals.particleCount > 0 && (
        <AIParticleTrail
          pathPoints={pathPoints}
          progress={task.progress}
          color={secondaryColor}
          particleCount={aiVisuals.particleCount}
          style={aiVisuals.particleStyle}
        />
      )}
    </group>
  );
}

// AI-Controlled Particle Trail Component
function AIParticleTrail({
  pathPoints,
  progress,
  color,
  particleCount,
  style,
}: {
  pathPoints: THREE.Vector3[];
  progress: number;
  color: string;
  particleCount: number;
  style: string;
}) {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const pathIndex = Math.max(0, Math.floor((progress / 100) * pathPoints.length) - i * 2);

        if (pathIndex >= 0 && pathIndex < pathPoints.length) {
          const point = pathPoints[pathIndex];
          const wobble = style === 'smoke' ? Math.sin(state.clock.elapsedTime + i) * 0.2 : 0;

          positions.array[i3] = point.x + wobble;
          positions.array[i3 + 1] = point.y + wobble;
          positions.array[i3 + 2] = point.z + wobble;
        }
      }
      positions.needsUpdate = true;
    }
  });

  const particlePositions = new Float32Array(particleCount * 3);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={style === 'sparkles' ? 0.2 : 0.1}
        color={color}
        transparent
        opacity={style === 'smoke' ? 0.4 : 0.7}
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

// Component to render all active task paths
interface TaskPathsProps {
  tasks: TaskWithAnimation[];
  getRoomPosition: (roomId: string) => [number, number, number] | undefined;
}

export function TaskPaths({ tasks, getRoomPosition }: TaskPathsProps) {
  return (
    <>
      {tasks.map((task) => {
        const targetPos = getRoomPosition(task.targetRoomId);

        // For tasks without source room, use entrance position
        const sourcePos = task.sourceRoomId
          ? getRoomPosition(task.sourceRoomId)
          : ([0, 2, 15] as [number, number, number]); // Default entrance position

        if (!targetPos || !sourcePos) return null;

        return (
          <TaskPathAnimation
            key={task.id}
            task={task}
            sourcePosition={sourcePos}
            targetPosition={targetPos}
          />
        );
      })}
    </>
  );
}
