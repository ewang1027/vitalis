import { useMemo, useState } from 'react';
import { Accordion } from '@/components/ui/accordion';
import { PatientVitalsCard } from '@/components/PatientVitalsCard';
import { usePatientsDashboard, useRooms } from '@/hooks/useSupabaseData';
import { useRealtimeVitals } from '@/hooks/useRealtimeVitals';
import { Loader2, Users, Filter, ArrowUpDown, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AddPatientDialog } from '@/components/AddPatientDialog';

function getSeverityPriority(severity?: string | null): number {
  if (!severity) return 3;

  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 1;
  if (normalized === 'moderate' || normalized === 'warning') return 2;
  return 3;
}

export function PatientVitalsDashboard() {
  const { patientsData, loading: patientsLoading, error: patientsError, refetch } = usePatientsDashboard();
  const { rooms, loading: roomsLoading } = useRooms();
  const [filterBySeverity, setFilterBySeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('severity');
  const [addPatientOpen, setAddPatientOpen] = useState(false);

  // Reload page after adding patient for now (simple solution)
  const handlePatientAdded = () => {
    // Simple solution: reload the page to get fresh data
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Filter and sort patients
  const sortedPatientsData = useMemo(() => {
    // First, filter by severity
    let filtered = [...patientsData];
    if (filterBySeverity !== 'all') {
      filtered = filtered.filter(({ patient }) => {
        const severity = patient.severity?.toLowerCase() || 'stable';
        return severity === filterBySeverity;
      });
    }

    // Then, sort by selected criteria
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity': {
          const priorityA = getSeverityPriority(a.patient.severity);
          const priorityB = getSeverityPriority(b.patient.severity);
          return priorityA - priorityB;
        }
        
        case 'name':
          return a.patient.name.localeCompare(b.patient.name);
        
        case 'room':
          return (a.roomNumber || '').localeCompare(b.roomNumber || '');
        
        case 'age':
          return (a.patient.age || 0) - (b.patient.age || 0);
        
        default:
          return 0;
      }
    });
  }, [patientsData, filterBySeverity, sortBy]);

  // Extract patient IDs and severities for real-time vitals
  const patientIds = useMemo(() => sortedPatientsData.map(p => p.patient.id), [sortedPatientsData]);
  const patientSeverities = useMemo(() => {
    const map = new Map<string, string | null>();
    sortedPatientsData.forEach(p => map.set(p.patient.id, p.patient.severity));
    return map;
  }, [sortedPatientsData]);

  const { vitalsData, loading: vitalsLoading } = useRealtimeVitals({
    patientIds,
    patientSeverities,
    updateInterval: 3000,
    enableSimulation: true,
  });

  if (patientsLoading || vitalsLoading || roomsLoading) {
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
      <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
        <div className="text-center">
          <Users className="h-8 w-8 text-text-gray mx-auto mb-2" />
          <p className="text-sm text-text-gray mb-1">No active patients</p>
          <p className="text-xs text-text-gray">Add a patient to get started</p>
        </div>
        <Button onClick={() => setAddPatientOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Button>
        <AddPatientDialog
          open={addPatientOpen}
          onOpenChange={setAddPatientOpen}
          onPatientAdded={handlePatientAdded}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-text-gray/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text-dark">Patient Dashboard</h2>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-gray" />
            <span className="text-sm text-text-gray">{sortedPatientsData.length}/{rooms.length}</span>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Filter by Severity */}
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-3.5 w-3.5 text-text-gray" />
            <Select value={filterBySeverity} onValueChange={setFilterBySeverity}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 flex-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-text-gray" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">By Severity</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="room">By Room</SelectItem>
                <SelectItem value="age">By Age</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <Accordion type="multiple" className="w-full">
          {sortedPatientsData.map(({ patient, roomNumber, doctorName }) => (
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

      {/* Footer with Add Patient Button */}
      <div className="px-4 py-3 border-t border-text-gray/10 bg-bg-tertiary/30">
        <Button 
          onClick={() => setAddPatientOpen(true)}
          className="w-full gap-2 bg-accent-green hover:bg-accent-green/90"
          size="sm"
        >
          <UserPlus className="h-4 w-4" />
          Add New Patient
        </Button>
      </div>

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        onPatientAdded={handlePatientAdded}
      />
    </div>
  );
}
