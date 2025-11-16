import { Progress } from '@/components/ui/progress';
import { Activity, Droplet, Thermometer, Wind } from 'lucide-react';

export type VitalType = 'heartRate' | 'bloodPressure' | 'temperature' | 'oxygenSaturation';

interface VitalQuarterProps {
  type: VitalType;
  value: number | string | null;
  compact?: boolean;
}

// Normal ranges for determining status
const VITAL_RANGES = {
  heartRate: { min: 60, max: 100, unit: 'bpm', critical: { low: 50, high: 120 } },
  bloodPressure: {
    systolic: { min: 90, max: 140, critical: { low: 80, high: 160 } },
    diastolic: { min: 60, max: 90, critical: { low: 50, high: 100 } },
    unit: ''
  },
  temperature: { min: 97.0, max: 99.5, unit: '°F', critical: { low: 95, high: 101 } },
  oxygenSaturation: { min: 95, max: 100, unit: '%', critical: { low: 90, high: 100 } },
};

type VitalStatus = 'normal' | 'warning' | 'critical';

function getVitalStatus(type: VitalType, value: number | string | null): VitalStatus {
  if (value === null) return 'normal';

  if (type === 'bloodPressure' && typeof value === 'string') {
    const [systolic, diastolic] = value.split('/').map(Number);
    if (isNaN(systolic) || isNaN(diastolic)) return 'normal';

    const sysRange = VITAL_RANGES.bloodPressure.systolic;
    const diaRange = VITAL_RANGES.bloodPressure.diastolic;

    if (systolic < sysRange.critical.low || systolic > sysRange.critical.high ||
        diastolic < diaRange.critical.low || diastolic > diaRange.critical.high) {
      return 'critical';
    }
    if (systolic < sysRange.min || systolic > sysRange.max ||
        diastolic < diaRange.min || diastolic > diaRange.max) {
      return 'warning';
    }
    return 'normal';
  }

  if (typeof value === 'number') {
    const range = VITAL_RANGES[type];
    if ('critical' in range) {
      if (value < range.critical.low || value > range.critical.high) return 'critical';
      if (value < range.min || value > range.max) return 'warning';
    }
  }

  return 'normal';
}

function getVitalProgress(type: VitalType, value: number | string | null): number {
  if (value === null) return 0;

  if (type === 'bloodPressure' && typeof value === 'string') {
    const [systolic] = value.split('/').map(Number);
    if (isNaN(systolic)) return 0;
    // Map systolic 80-180 to 0-100%
    return Math.min(100, Math.max(0, ((systolic - 80) / 100) * 100));
  }

  if (typeof value === 'number') {
    const range = VITAL_RANGES[type];
    if ('critical' in range) {
      // Map from critical.low to critical.high to 0-100%
      const min = range.critical.low;
      const max = range.critical.high;
      return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    }
  }

  return 50; // Default
}

function getVitalIcon(type: VitalType) {
  switch (type) {
    case 'heartRate':
      return Activity;
    case 'bloodPressure':
      return Droplet;
    case 'temperature':
      return Thermometer;
    case 'oxygenSaturation':
      return Wind;
  }
}

function getVitalLabel(type: VitalType): string {
  switch (type) {
    case 'heartRate':
      return 'Heart Rate';
    case 'bloodPressure':
      return 'Blood Pressure';
    case 'temperature':
      return 'Temperature';
    case 'oxygenSaturation':
      return 'SpO₂';
  }
}

function getVitalUnit(type: VitalType): string {
  return VITAL_RANGES[type].unit;
}

function formatVitalValue(type: VitalType, value: number | string | null): string {
  if (value === null) return '--';

  if (type === 'bloodPressure') {
    return String(value);
  }

  const unit = getVitalUnit(type);
  return `${value}${unit}`;
}

export function VitalQuarter({ type, value, compact = false }: VitalQuarterProps) {
  const Icon = getVitalIcon(type);
  const status = getVitalStatus(type, value);
  const progress = getVitalProgress(type, value);
  const label = getVitalLabel(type);
  const formattedValue = formatVitalValue(type, value);

  const statusColors = {
    normal: 'text-accent-green',
    warning: 'text-accent-yellow',
    critical: 'text-accent-red',
  };

  const progressColors = {
    normal: 'bg-accent-green',
    warning: 'bg-accent-yellow',
    critical: 'bg-accent-red',
  };

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary transition-smooth">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${statusColors[status]}`} />
        <span className="text-xs text-text-gray font-medium">{label}</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className={`text-lg font-semibold ${statusColors[status]}`}>
          {formattedValue}
        </div>

        {!compact && (
          <div className="relative w-full">
            <Progress
              value={progress}
              className="h-1.5"
              indicatorClassName={progressColors[status]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
