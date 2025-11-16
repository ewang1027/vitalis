import { Badge } from '@/components/ui/badge';
import { VitalQuarter } from '@/components/VitalQuarter';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatDistanceToNow } from 'date-fns';
import type { VitalData } from '@/hooks/useRealtimeVitals';
import type { Database } from '@/lib/supabase';

type Patient = Database['public']['Tables']['patients']['Row'];

interface PatientVitalsCardProps {
  patient: Patient;
  roomNumber: string | null;
  doctorName: string | null;
  vitalData: VitalData | null;
}

function getSeverityColor(severity?: string | null): string {
  if (!severity) return 'bg-accent-green/20 text-accent-green border-accent-green/30';

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'bg-accent-red/20 text-accent-red border-accent-red/30';
  if (normalized === 'moderate' || normalized === 'warning')
    return 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30';
  return 'bg-accent-green/20 text-accent-green border-accent-green/30';
}

function formatLastCheckedIn(timestamp: string | null): string {
  if (!timestamp) return 'No recent data';

  try {
    const distance = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    return distance;
  } catch {
    return 'Invalid date';
  }
}

export function PatientVitalsCard({
  patient,
  roomNumber,
  doctorName,
  vitalData,
}: PatientVitalsCardProps) {
  const severityColor = getSeverityColor(patient.severity);
  const lastCheckedIn = formatLastCheckedIn(vitalData?.recordedAt || null);
  const dataSourceBadge = vitalData?.dataSource === 'simulated' ? 'DEMO' : 'LIVE';
  const dataSourceColor = vitalData?.dataSource === 'simulated'
    ? 'bg-text-gray/20 text-text-gray border-text-gray/30'
    : 'bg-accent-green/20 text-accent-green border-accent-green/30';

  return (
    <AccordionItem value={patient.id} className="border-b border-text-gray/10">
      <AccordionTrigger className="hover:no-underline py-3 px-2">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-dark truncate max-w-[140px]">
              {patient.name}
            </span>
            {roomNumber && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {roomNumber}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={`text-xs px-2 py-0 ${severityColor}`}>
            {patient.severity || 'Stable'}
          </Badge>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-2 pb-3">
        <div className="flex gap-4">
          {/* Left side - Patient Info */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div>
              <p className="text-xs text-text-gray uppercase tracking-wide">Patient ID</p>
              <p className="text-xs font-mono text-text-dark">{patient.id.slice(0, 8)}</p>
            </div>

            {doctorName && (
              <div>
                <p className="text-xs text-text-gray">Doctor</p>
                <p className="text-sm font-semibold text-text-dark">{doctorName}</p>
              </div>
            )}

            <div>
              <p className="text-lg font-bold text-text-dark">{patient.name}</p>
            </div>

            <div>
              <p className="text-base text-text-gray">
                {patient.gender} • {patient.age} years
              </p>
            </div>

            {patient.condition && (
              <div className="mt-1">
                <p className="text-xs text-text-gray">Condition</p>
                <p className="text-sm text-text-dark">{patient.condition}</p>
              </div>
            )}
          </div>

          {/* Right side - Vitals */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-gray uppercase tracking-wide">Last checked in</p>
                <p className="text-xs text-text-dark">{lastCheckedIn}</p>
              </div>
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${dataSourceColor}`}>
                {dataSourceBadge}
              </Badge>
            </div>

            <div>
              <p className="text-lg font-bold text-text-dark mb-2">Vitals</p>

              {/* Quarter grid layout for vitals */}
              <div className="grid grid-cols-2 gap-2">
                <VitalQuarter
                  type="heartRate"
                  value={vitalData?.heartRate || null}
                />
                <VitalQuarter
                  type="bloodPressure"
                  value={vitalData?.bloodPressure || null}
                />
                <VitalQuarter
                  type="oxygenSaturation"
                  value={vitalData?.oxygenSaturation || null}
                />
                <VitalQuarter
                  type="temperature"
                  value={vitalData?.temperature || null}
                />
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
