export type VitalSign = {
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  oxygenSaturation: number;
};

export type PatientState = 'stable' | 'moderate' | 'critical';

// Normal ranges for vital signs
const VITAL_RANGES = {
  stable: {
    heartRate: { min: 60, max: 80, variance: 5 },
    systolic: { min: 110, max: 130, variance: 5 },
    diastolic: { min: 70, max: 85, variance: 3 },
    temperature: { min: 98.0, max: 98.8, variance: 0.3 },
    oxygenSaturation: { min: 97, max: 100, variance: 1 },
  },
  moderate: {
    heartRate: { min: 80, max: 100, variance: 8 },
    systolic: { min: 130, max: 150, variance: 8 },
    diastolic: { min: 85, max: 95, variance: 5 },
    temperature: { min: 99.0, max: 100.5, variance: 0.5 },
    oxygenSaturation: { min: 93, max: 97, variance: 2 },
  },
  critical: {
    heartRate: { min: 100, max: 130, variance: 12 },
    systolic: { min: 150, max: 180, variance: 10 },
    diastolic: { min: 95, max: 110, variance: 8 },
    temperature: { min: 100.5, max: 103.0, variance: 0.8 },
    oxygenSaturation: { min: 88, max: 93, variance: 3 },
  },
};

// Store previous values for smooth transitions
const vitalHistory = new Map<string, VitalSign>();

/**
 * Generates a random number within a range with variance
 */
function randomInRange(min: number, max: number, variance: number, previousValue?: number): number {
  if (previousValue !== undefined) {
    // Generate value close to previous value for smooth transitions
    const change = (Math.random() - 0.5) * variance * 2;
    let newValue = previousValue + change;

    // Clamp to min/max range
    newValue = Math.max(min, Math.min(max, newValue));
    return Math.round(newValue * 10) / 10; // Round to 1 decimal
  }

  // Initial random value in range
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/**
 * Generates realistic blood pressure reading
 */
function generateBloodPressure(
  systolicRange: { min: number; max: number; variance: number },
  diastolicRange: { min: number; max: number; variance: number },
  previousBP?: string
): string {
  let systolic: number;
  let diastolic: number;

  if (previousBP) {
    const [prevSys, prevDia] = previousBP.split('/').map(Number);
    systolic = Math.round(randomInRange(systolicRange.min, systolicRange.max, systolicRange.variance, prevSys));
    diastolic = Math.round(randomInRange(diastolicRange.min, diastolicRange.max, diastolicRange.variance, prevDia));
  } else {
    systolic = Math.round(randomInRange(systolicRange.min, systolicRange.max, systolicRange.variance));
    diastolic = Math.round(randomInRange(diastolicRange.min, diastolicRange.max, diastolicRange.variance));
  }

  return `${systolic}/${diastolic}`;
}

/**
 * Simulates realistic vital signs for a patient
 */
export function simulateVitals(patientId: string, state: PatientState = 'stable'): VitalSign {
  const ranges = VITAL_RANGES[state];
  const previousVitals = vitalHistory.get(patientId);

  const vitals: VitalSign = {
    heartRate: Math.round(randomInRange(
      ranges.heartRate.min,
      ranges.heartRate.max,
      ranges.heartRate.variance,
      previousVitals?.heartRate
    )),
    bloodPressure: generateBloodPressure(
      ranges.systolic,
      ranges.diastolic,
      previousVitals?.bloodPressure
    ),
    temperature: randomInRange(
      ranges.temperature.min,
      ranges.temperature.max,
      ranges.temperature.variance,
      previousVitals?.temperature
    ),
    oxygenSaturation: Math.round(randomInRange(
      ranges.oxygenSaturation.min,
      ranges.oxygenSaturation.max,
      ranges.oxygenSaturation.variance,
      previousVitals?.oxygenSaturation
    )),
  };

  // Store for next simulation
  vitalHistory.set(patientId, vitals);

  return vitals;
}

/**
 * Determines patient state based on severity field
 */
export function getPatientStateFromSeverity(severity?: string | null): PatientState {
  if (!severity) return 'stable';

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'moderate' || normalized === 'warning') return 'moderate';
  return 'stable';
}

/**
 * Clears vital history for a patient (useful for cleanup)
 */
export function clearVitalHistory(patientId: string): void {
  vitalHistory.delete(patientId);
}

/**
 * Clears all vital history
 */
export function clearAllVitalHistory(): void {
  vitalHistory.clear();
}
