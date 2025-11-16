import { usePatientsDashboard } from '@/hooks/useSupabaseData';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

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

export function PatientStatusBar({ onExpand }: PatientStatusBarProps) {
  const { patientsData, loading } = usePatientsDashboard();

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
          patientsData.map(({ patient }) => (
            <div
              key={patient.id}
              className="relative group"
              title={`${patient.name} - ${patient.severity || 'Stable'}`}
            >
              <div
                className={`h-8 w-8 rounded-full ${getSeverityColor(patient.severity)} transition-all hover:scale-110 cursor-pointer flex items-center justify-center`}
                onClick={onExpand}
              >
                <div className="h-4 w-4 rounded-full bg-white/30" />
              </div>

              {/* Tooltip on hover */}
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                <div className="bg-text-dark text-text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {patient.name}
                  <div className="text-text-white-dim text-xs">{patient.severity || 'Stable'}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Patient Count */}
      {!loading && patientsData.length > 0 && (
        <div className="p-2 border-t border-border">
          <div className="text-xs font-semibold text-text-gray text-center">
            {patientsData.length}
          </div>
        </div>
      )}
    </div>
  );
}
