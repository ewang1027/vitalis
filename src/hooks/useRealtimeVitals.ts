import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { simulateVitals, getPatientStateFromSeverity, clearVitalHistory } from '@/utils/simulateVitals';

type Vital = Database['public']['Tables']['vitals']['Row'];

export type VitalData = {
  patientId: string;
  heartRate: number | null;
  bloodPressure: string | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  recordedAt: string;
  dataSource: 'webhook' | 'simulated';
};

type VitalDataMap = Map<string, VitalData>;

interface UseRealtimeVitalsOptions {
  patientIds: string[];
  patientSeverities?: Map<string, string | null>; // Map of patientId to severity
  updateInterval?: number; // Milliseconds between simulated updates (default: 3000)
  enableSimulation?: boolean; // Whether to simulate data for patients without real data
}

/**
 * Hook that provides real-time vital signs data with hybrid webhook/simulated sources
 */
export function useRealtimeVitals({
  patientIds,
  patientSeverities = new Map(),
  updateInterval = 3000,
  enableSimulation = true,
}: UseRealtimeVitalsOptions) {
  const [vitalsData, setVitalsData] = useState<VitalDataMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWebhookUpdate = useRef<Map<string, number>>(new Map());

  // Initial fetch of real vitals from database
  useEffect(() => {
    async function fetchInitialVitals() {
      if (patientIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('vitals')
          .select('*')
          .in('patient_id', patientIds)
          .order('recorded_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Get the latest vital for each patient
        const latestVitals = new Map<string, Vital>();
        data?.forEach((vital) => {
          if (!latestVitals.has(vital.patient_id)) {
            latestVitals.set(vital.patient_id, vital);
          }
        });

        // Convert to VitalData format
        const initialData = new Map<string, VitalData>();
        latestVitals.forEach((vital, patientId) => {
          initialData.set(patientId, {
            patientId,
            heartRate: vital.heart_rate,
            bloodPressure: vital.blood_pressure,
            temperature: vital.temperature,
            oxygenSaturation: vital.oxygen_saturation,
            recordedAt: vital.recorded_at,
            dataSource: 'webhook',
          });
          lastWebhookUpdate.current.set(patientId, Date.now());
        });

        setVitalsData(initialData);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching initial vitals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialVitals();
  }, [patientIds]);

  // Subscribe to real-time updates from Supabase
  useEffect(() => {
    if (patientIds.length === 0) return;

    const channel = supabase
      .channel('vitals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vitals',
          filter: `patient_id=in.(${patientIds.join(',')})`,
        },
        (payload) => {
          console.log('Real-time vital update received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const vital = payload.new as Vital;

            setVitalsData((prev) => {
              const updated = new Map(prev);
              updated.set(vital.patient_id, {
                patientId: vital.patient_id,
                heartRate: vital.heart_rate,
                bloodPressure: vital.blood_pressure,
                temperature: vital.temperature,
                oxygenSaturation: vital.oxygen_saturation,
                recordedAt: vital.recorded_at,
                dataSource: 'webhook',
              });
              return updated;
            });

            lastWebhookUpdate.current.set(vital.patient_id, Date.now());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientIds]);

  // Simulate vitals for patients without recent webhook data
  useEffect(() => {
    if (!enableSimulation || patientIds.length === 0) return;

    simulationIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 10000; // Consider data stale after 10 seconds

      setVitalsData((prev) => {
        const updated = new Map(prev);

        patientIds.forEach((patientId) => {
          const lastUpdate = lastWebhookUpdate.current.get(patientId) || 0;
          const isStale = now - lastUpdate > staleThreshold;
          const hasNoData = !prev.has(patientId);

          // Only simulate if no data exists or data is stale
          if (hasNoData || isStale) {
            const severity = patientSeverities.get(patientId);
            const state = getPatientStateFromSeverity(severity);
            const simulated = simulateVitals(patientId, state);

            updated.set(patientId, {
              patientId,
              heartRate: simulated.heartRate,
              bloodPressure: simulated.bloodPressure,
              temperature: simulated.temperature,
              oxygenSaturation: simulated.oxygenSaturation,
              recordedAt: new Date().toISOString(),
              dataSource: 'simulated',
            });
          }
        });

        return updated;
      });
    }, updateInterval);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [patientIds, patientSeverities, updateInterval, enableSimulation]);

  // Cleanup vital history on unmount
  useEffect(() => {
    return () => {
      patientIds.forEach((id) => clearVitalHistory(id));
    };
  }, [patientIds]);

  return {
    vitalsData,
    loading,
    error,
  };
}
