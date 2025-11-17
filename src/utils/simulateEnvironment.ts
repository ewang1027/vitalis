// Simulate realistic room environmental data for ESP32 when real data isn't available

export type EnvironmentData = {
  temperature: number;      // Celsius
  humidity: number;         // Percentage
  motion: boolean;
  distance: number;         // cm
  inBed: boolean;
  light: number;           // 0-1000 lux
};

// Store previous values for smooth transitions
const envHistory = new Map<string, EnvironmentData>();

// Realistic ranges for room environment
const ENV_RANGES = {
  temperature: { min: 20, max: 24, variance: 0.5 },
  humidity: { min: 40, max: 60, variance: 2 },
  distance: { min: 50, max: 200, variance: 10 },
  light: { min: 200, max: 800, variance: 50 },
};

// Trigger events to add realism
interface TriggerState {
  lastMotionTime: number;
  lastBedChangeTime: number;
  motionActive: boolean;
  patientInBed: boolean;
}

const triggerStates = new Map<string, TriggerState>();

/**
 * Generate random value with smooth transitions
 */
function smoothRandom(min: number, max: number, variance: number, previousValue?: number): number {
  if (previousValue !== undefined) {
    // Smooth change from previous value
    const change = (Math.random() - 0.5) * variance * 2;
    let newValue = previousValue + change;
    
    // Clamp to range
    newValue = Math.max(min, Math.min(max, newValue));
    return Math.round(newValue * 10) / 10;
  }
  
  // Initial random value
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/**
 * Simulate realistic room environment with triggers
 */
export function simulateEnvironment(roomId: string): EnvironmentData {
  const now = Date.now();
  const previous = envHistory.get(roomId);
  let trigger = triggerStates.get(roomId);
  
  // Initialize trigger state if needed
  if (!trigger) {
    trigger = {
      lastMotionTime: 0,
      lastBedChangeTime: now,
      motionActive: false,
      patientInBed: Math.random() > 0.3, // 70% chance patient is in bed
    };
    triggerStates.set(roomId, trigger);
  }
  
  // TRIGGER: Motion events (random, 5-15 second intervals when active)
  const timeSinceLastMotion = now - trigger.lastMotionTime;
  if (timeSinceLastMotion > 5000 + Math.random() * 10000) {
    trigger.motionActive = Math.random() > 0.6; // 40% chance of motion
    if (trigger.motionActive) {
      trigger.lastMotionTime = now;
    }
  }
  
  // Motion stays active for 3 seconds
  const motionDetected = trigger.motionActive && (now - trigger.lastMotionTime < 3000);
  
  // TRIGGER: Patient gets in/out of bed (every 30-120 seconds)
  const timeSinceBedChange = now - trigger.lastBedChangeTime;
  if (timeSinceBedChange > 30000 + Math.random() * 90000) {
    trigger.patientInBed = !trigger.patientInBed;
    trigger.lastBedChangeTime = now;
    trigger.motionActive = true; // Motion when getting in/out
    trigger.lastMotionTime = now;
  }
  
  // Distance correlates with bed occupancy
  let distance: number;
  if (trigger.patientInBed) {
    // Patient in bed: closer distance (50-80cm)
    distance = smoothRandom(50, 80, 5, previous?.distance);
  } else {
    // Patient out of bed: farther distance (150-200cm)
    distance = smoothRandom(150, 200, 10, previous?.distance);
  }
  
  // Temperature varies slightly, increases with motion/activity
  let temp = smoothRandom(
    ENV_RANGES.temperature.min,
    ENV_RANGES.temperature.max,
    ENV_RANGES.temperature.variance,
    previous?.temperature
  );
  
  // Slight temp increase when patient is active
  if (motionDetected) {
    temp += 0.2;
  }
  
  // Humidity varies naturally
  const humidity = smoothRandom(
    ENV_RANGES.humidity.min,
    ENV_RANGES.humidity.max,
    ENV_RANGES.humidity.variance,
    previous?.humidity
  );
  
  // Light level varies (daytime simulation)
  const hour = new Date().getHours();
  let lightBase = 300; // Default
  
  if (hour >= 6 && hour < 12) {
    // Morning: increasing light
    lightBase = 400 + (hour - 6) * 50;
  } else if (hour >= 12 && hour < 18) {
    // Afternoon: bright
    lightBase = 700;
  } else if (hour >= 18 && hour < 22) {
    // Evening: decreasing light
    lightBase = 600 - (hour - 18) * 100;
  } else {
    // Night: dim
    lightBase = 100;
  }
  
  const light = smoothRandom(
    lightBase - 100,
    lightBase + 100,
    ENV_RANGES.light.variance,
    previous?.light
  );
  
  const envData: EnvironmentData = {
    temperature: temp,
    humidity,
    motion: motionDetected,
    distance: Math.round(distance),
    inBed: trigger.patientInBed,
    light: Math.round(light),
  };
  
  // Store for next simulation
  envHistory.set(roomId, envData);
  
  return envData;
}

/**
 * Clear history for a room
 */
export function clearEnvironmentHistory(roomId: string) {
  envHistory.delete(roomId);
  triggerStates.delete(roomId);
}

