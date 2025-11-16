import { useMemo } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { PatientVitalsCard } from '@/components/PatientVitalsCard';
import { usePatientsDashboard } from '@/hooks/useSupabaseData';
import { useRealtimeVitals } from '@/hooks/useRealtimeVitals';
import { Loader2, Users } from 'lucide-react';

export function PatientVitalsDashboard() {
  const { patientsData, loading: patientsLoading, error: patientsError } = usePatientsDashboard();

  // Extract patient IDs and severities for real-time vitals
  const patientIds = useMemo(() => patientsData.map(p => p.patient.id), [patientsData]);
  const patientSeverities = useMemo(() => {
    const map = new Map<string, string | null>();
    patientsData.forEach(p => map.set(p.patient.id, p.patient.severity));
    return map;
  }, [patientsData]);

  const { vitalsData, loading: vitalsLoading } = useRealtimeVitals({
    patientIds,
    patientSeverities,
    updateInterval: 3000,
    enableSimulation: true,
  });

  if (patientsLoading || vitalsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-accent-green" />
          <p className="text-sm text-text-gray">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-sm text-accent-red font-semibold">Error loading patients</p>
          <p className="text-xs text-text-gray mt-1">{patientsError.message}</p>
        </div>
      </div>
    );
  }

  if (patientsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <Users className="h-8 w-8 text-text-gray mx-auto mb-2" />
          <p className="text-sm text-text-gray">No active patients</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-text-gray/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-dark">Patient Dashboard</h2>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-gray" />
            <span className="text-sm text-text-gray">{patientsData.length} patients</span>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <Accordion type="single" collapsible className="w-full">
          {patientsData.map(({ patient, roomNumber, doctorName }) => (
            <PatientVitalsCard
              key={patient.id}
              patient={patient}
              roomNumber={roomNumber}
              doctorName={doctorName}
              vitalData={vitalsData.get(patient.id) || null}
            />
          ))}
        </Accordion>
      </div>

      {/* Footer with helpful info */}
      <div className="px-4 py-2 border-t border-text-gray/10 bg-bg-tertiary/30">
        <p className="text-xs text-text-gray text-center">
          Vitals update every 3 seconds • Click patient to expand details
        </p>
      </div>
    </div>
  );
}
