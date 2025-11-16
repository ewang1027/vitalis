import { usePatientsDashboard } from '@/hooks/useSupabaseData';
import { LayoutDashboard, Loader2, User, MapPin, Stethoscope, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';

interface PatientStatusBarProps {
  onExpand: () => void;
}

function getSeverityColor(severity?: string | null): string {
  if (!severity) return 'bg-accent-green';

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'bg-accent-red';
  if (normalized === 'moderate' || normalized === 'warning') return 'bg-accent-yellow';
  return 'bg-accent-green';
}

function getSeverityBadgeClass(severity?: string | null): string {
  if (!severity) return 'bg-accent-green text-white';

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'bg-accent-red text-white';
  if (normalized === 'moderate' || normalized === 'warning') return 'bg-accent-yellow text-text-dark';
  return 'bg-accent-green text-white';
}

function getSeverityPriority(severity?: string | null): number {
  if (!severity) return 3;

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 1;
  if (normalized === 'moderate' || normalized === 'warning') return 2;
  return 3;
}

export function PatientStatusBar({ onExpand }: PatientStatusBarProps) {
  const { patientsData, loading } = usePatientsDashboard();

  // Sort patients by urgency (critical first, then moderate, then stable)
  const sortedPatientsData = [...patientsData].sort((a, b) => {
    const priorityA = getSeverityPriority(a.patient.severity);
    const priorityB = getSeverityPriority(b.patient.severity);
    return priorityA - priorityB;
  });

  return (
    <div className="h-full w-12 border-l border-border bg-bg-secondary flex flex-col items-center animate-in slide-in-from-right duration-300">
      {/* Expand Button */}
      <div className="p-2 border-b border-border flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpand}
          className="text-text-tertiary hover:text-text-primary h-8 w-8 p-0"
          title="Expand dashboard"
        >
          <LayoutDashboard className="h-4 w-4 animate-pulse" />
        </Button>
      </div>

      {/* Patient Status Indicators */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2 flex flex-col gap-2 items-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-text-gray mt-4" />
        ) : (
          sortedPatientsData.map(({ patient, roomNumber, doctorName }) => (
            <HoverCard key={patient.id} openDelay={200}>
              <HoverCardTrigger asChild>
                <div
                  className={`h-8 w-8 rounded-full ${getSeverityColor(patient.severity)} transition-all hover:scale-110 cursor-pointer flex items-center justify-center relative z-10`}
                  onClick={onExpand}
                >
                  <div className="h-4 w-4 rounded-full bg-white/30" />
                </div>
              </HoverCardTrigger>
              <HoverCardContent 
                side="left" 
                align="center" 
                sideOffset={12}
                className="w-64 p-4 bg-white dark:bg-gray-800 shadow-2xl border-2 border-border relative z-[100]"
              >
                {/* Arrow pointing to circle */}
                <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-border" />
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[7px] border-l-white dark:border-l-gray-800" />
                
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-text-dark mb-1">{patient.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-text-gray">
                      <User className="h-3 w-3" />
                      <span>
                        {patient.age && `${patient.age}y`}
                        {patient.age && patient.gender && ' • '}
                        {patient.gender}
                      </span>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs font-semibold ${getSeverityBadgeClass(patient.severity)}`}
                  >
                    {patient.severity || 'Stable'}
                  </Badge>
                </div>

                {/* Patient Details */}
                <div className="space-y-2 text-xs">
                  {roomNumber && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="h-3 w-3 text-text-gray" />
                      <span>Room {roomNumber}</span>
                    </div>
                  )}
                  {doctorName && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Stethoscope className="h-3 w-3 text-text-gray" />
                      <span>Dr. {doctorName}</span>
                    </div>
                  )}
                  {patient.admissionDate && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="h-3 w-3 text-text-gray" />
                      <span>Admitted {new Date(patient.admissionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action */}
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={onExpand}
                    className="text-xs text-accent-green hover:text-accent-green/80 font-medium w-full text-left"
                  >
                    View Full Details →
                  </button>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))
        )}
      </div>

      {/* Patient Count */}
      {!loading && sortedPatientsData.length > 0 && (
        <div className="p-2 border-t border-border">
          <div className="text-xs font-semibold text-text-gray text-center">
            {sortedPatientsData.length}
          </div>
        </div>
      )}
    </div>
  );
}
