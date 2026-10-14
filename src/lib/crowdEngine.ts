import {
  Appointment,
  CrowdLevel,
  CrowdMetrics,
  CrowdSourceType,
  FreshnessStatus,
} from '../types';
import { evaluateFreshness } from './freshness';

export interface CrowdConfig {
  lowThreshold: number;      // default: 2
  moderateThreshold: number; // default: 5
  defaultAvgServiceMins: number; // default: 12 mins
}

export const DEFAULT_CROWD_CONFIG: CrowdConfig = {
  lowThreshold: 2,
  moderateThreshold: 5,
  defaultAvgServiceMins: 12,
};

/**
 * Calculates Expected Patient Load from future confirmed bookings.
 * 
 * Rules:
 * - Confirmed appointments in interval are included.
 * - Cancelled, completed, and no-show appointments are strictly excluded.
 * - Checked_in and in_service are part of the current active queue, not future load.
 */
export function calculateExpectedPatientLoad(
  appointments: Appointment[],
  hospitalId: string,
  targetDateStr: string = new Date().toISOString().split('T')[0]
): { count: number; intervalLabel: string } {
  const eligible = appointments.filter((apt) => {
    return (
      apt.hospital_id === hospitalId &&
      apt.appointment_date === targetDateStr &&
      apt.status === 'confirmed'
    );
  });

  return {
    count: eligible.length,
    intervalLabel: 'Today (Confirmed Bookings)',
  };
}

/**
 * Calculates Current Waiting Crowd from checked-in queue.
 * 
 * Waiting statuses: 'checked_in' and 'called'.
 * In-service: 'in_service' (tracked separately, NOT waiting).
 * Completed: 'completed' (consultation finished).
 */
export function calculateQueueBreakdown(
  appointments: Appointment[],
  hospitalId: string,
  targetDateStr: string = new Date().toISOString().split('T')[0]
) {
  let waitingCount = 0;
  let inServiceCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let noShowCount = 0;

  for (const apt of appointments) {
    if (apt.hospital_id !== hospitalId || apt.appointment_date !== targetDateStr) {
      continue;
    }

    switch (apt.status) {
      case 'checked_in':
      case 'called':
        waitingCount++;
        break;
      case 'in_service':
        inServiceCount++;
        break;
      case 'completed':
        completedCount++;
        break;
      case 'cancelled':
        cancelledCount++;
        break;
      case 'no_show':
        noShowCount++;
        break;
    }
  }

  return {
    waitingCount,
    inServiceCount,
    completedCount,
    cancelledCount,
    noShowCount,
  };
}

/**
 * Computes the rolling average service duration from completed appointments.
 * Falls back to clinic default if insufficient historical samples (< 2).
 */
export function calculateRollingAverageDuration(
  appointments: Appointment[],
  hospitalId: string,
  defaultDurationMins: number = 12
): number {
  const completedWithTiming = appointments.filter(
    (apt) =>
      apt.hospital_id === hospitalId &&
      apt.status === 'completed' &&
      apt.in_service_at &&
      apt.completed_at
  );

  if (completedWithTiming.length < 2) {
    return defaultDurationMins;
  }

  // Calculate duration in minutes for each completed consultation
  const durations = completedWithTiming.map((apt) => {
    const start = new Date(apt.in_service_at!).getTime();
    const end = new Date(apt.completed_at!).getTime();
    const diffMins = Math.max(3, Math.min(60, (end - start) / 60000));
    return diffMins;
  });

  const sum = durations.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / durations.length);
}

/**
 * Estimates waiting time range (min, max) for a patient.
 * 
 * Uses multi-counter queue model:
 * Wait Time ~ (Patients Ahead / Active Counters) * Rolling Average Duration
 * Uncertainty range accounts for consultation variance (± 25%).
 */
export function estimateWaitingTimeRange(
  patientsAhead: number,
  activeCounters: number = 1,
  avgDurationMins: number = 12
): { minMins: number; maxMins: number } {
  if (patientsAhead <= 0) {
    return { minMins: 0, maxMins: 5 };
  }

  const effectiveCounters = Math.max(1, activeCounters);
  const queueBatches = patientsAhead / effectiveCounters;
  const centralEstimate = queueBatches * avgDurationMins;

  // Apply uncertainty range: -20% lower bound, +30% upper bound
  const minMins = Math.max(5, Math.round(centralEstimate * 0.8));
  const maxMins = Math.max(minMins + 5, Math.round(centralEstimate * 1.3));

  return { minMins, maxMins };
}

/**
 * Evaluates crowd level given waiting count, capacity, and configurable thresholds.
 */
export function determineCrowdLevel(
  waitingCount: number,
  activeCounters: number = 1,
  config: CrowdConfig = DEFAULT_CROWD_CONFIG
): CrowdLevel {
  const effectiveCapacity = Math.max(1, activeCounters);
  // Scale thresholds proportionally by number of operational counters
  const scaledLow = config.lowThreshold * effectiveCapacity;
  const scaledMod = config.moderateThreshold * effectiveCapacity;

  if (waitingCount <= scaledLow) {
    return 'low';
  }
  if (waitingCount <= scaledMod) {
    return 'moderate';
  }
  return 'high';
}

/**
 * Assembles full crowd metrics for a given hospital.
 */
export function computeHospitalCrowdMetrics(
  hospitalId: string,
  appointments: Appointment[],
  activeCounters: number = 1,
  baseAvgServiceMins: number = 12,
  source: CrowdSourceType = 'queue_system',
  verifiedAt?: string,
  updatedAt: string = new Date().toISOString(),
  config: CrowdConfig = DEFAULT_CROWD_CONFIG
): CrowdMetrics {
  const targetDate = new Date().toISOString().split('T')[0];
  const expected = calculateExpectedPatientLoad(appointments, hospitalId, targetDate);
  const queue = calculateQueueBreakdown(appointments, hospitalId, targetDate);
  const rollingAvg = calculateRollingAverageDuration(appointments, hospitalId, baseAvgServiceMins);
  const waitRange = estimateWaitingTimeRange(queue.waitingCount, activeCounters, rollingAvg);
  const crowdLevel = determineCrowdLevel(queue.waitingCount, activeCounters, config);
  const freshness = evaluateFreshness(verifiedAt || updatedAt);

  return {
    hospital_id: hospitalId,
    expected_patient_load: expected.count,
    time_interval_label: expected.intervalLabel,
    waiting_count: queue.waitingCount,
    in_service_count: queue.inServiceCount,
    completed_today_count: queue.completedCount,
    cancelled_today_count: queue.cancelledCount,
    no_show_today_count: queue.noShowCount,
    crowd_level: crowdLevel,
    estimated_wait_time_min: waitRange.minMins,
    estimated_wait_time_max: waitRange.maxMins,
    active_counters: activeCounters,
    rolling_avg_service_mins: rollingAvg,
    source,
    last_verified_at: verifiedAt,
    last_updated_at: updatedAt,
    freshness: freshness.status,
    is_stale: freshness.isStale,
  };
}
