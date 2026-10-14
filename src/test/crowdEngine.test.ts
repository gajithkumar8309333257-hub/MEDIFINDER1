import { describe, it, expect } from 'vitest';
import {
  calculateExpectedPatientLoad,
  calculateQueueBreakdown,
  calculateRollingAverageDuration,
  estimateWaitingTimeRange,
  determineCrowdLevel,
} from '../lib/crowdEngine';
import { evaluateFreshness } from '../lib/freshness';
import { calculateDistanceKm, formatDistance } from '../lib/distance';
import { Appointment } from '../types';

describe('Intelligent Crowd & Queue Engine Tests', () => {
  const targetDate = '2026-10-14';

  const mockAppointments: Appointment[] = [
    {
      id: 'apt-1',
      booking_reference: 'MF-2026-0001',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient One',
      patient_phone: '9876543210',
      appointment_date: targetDate,
      start_time: '10:00',
      end_time: '10:30',
      status: 'confirmed', // Should count in expected load, NOT in waiting queue
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T08:00:00Z',
    },
    {
      id: 'apt-2',
      booking_reference: 'MF-2026-0002',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Two',
      patient_phone: '9876543211',
      appointment_date: targetDate,
      start_time: '09:00',
      end_time: '09:30',
      status: 'checked_in', // Arrived & waiting -> counts in waiting crowd
      checked_in_at: '2026-10-14T08:55:00Z',
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T08:55:00Z',
    },
    {
      id: 'apt-3',
      booking_reference: 'MF-2026-0003',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Three',
      patient_phone: '9876543212',
      appointment_date: targetDate,
      start_time: '09:15',
      end_time: '09:45',
      status: 'called', // Called -> counts in waiting crowd
      called_at: '2026-10-14T09:10:00Z',
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T09:10:00Z',
    },
    {
      id: 'apt-4',
      booking_reference: 'MF-2026-0004',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Four',
      patient_phone: '9876543213',
      appointment_date: targetDate,
      start_time: '09:30',
      end_time: '10:00',
      status: 'in_service', // In service -> NOT waiting
      in_service_at: '2026-10-14T09:15:00Z',
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T09:15:00Z',
    },
    {
      id: 'apt-5',
      booking_reference: 'MF-2026-0005',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Five',
      patient_phone: '9876543214',
      appointment_date: targetDate,
      start_time: '08:30',
      end_time: '09:00',
      status: 'completed', // Completed -> NOT waiting, NOT expected future load
      in_service_at: '2026-10-14T08:35:00Z',
      completed_at: '2026-10-14T08:50:00Z',
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T08:50:00Z',
    },
    {
      id: 'apt-6',
      booking_reference: 'MF-2026-0006',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Six',
      patient_phone: '9876543215',
      appointment_date: targetDate,
      start_time: '11:00',
      end_time: '11:30',
      status: 'cancelled', // Cancelled -> NOT waiting, NOT expected load
      cancelled_at: '2026-10-14T08:20:00Z',
      created_at: '2026-10-14T08:00:00Z',
      updated_at: '2026-10-14T08:20:00Z',
    },
    {
      id: 'apt-7',
      booking_reference: 'MF-2026-0007',
      hospital_id: 'hosp-1',
      doctor_id: 'doc-1',
      patient_name: 'Patient Seven',
      patient_phone: '9876543216',
      appointment_date: targetDate,
      start_time: '08:00',
      end_time: '08:30',
      status: 'no_show', // No show -> NOT waiting, NOT expected load
      no_show_at: '2026-10-14T08:40:00Z',
      created_at: '2026-10-14T07:00:00Z',
      updated_at: '2026-10-14T08:40:00Z',
    },
  ];

  it('calculates expected patient load correctly, strictly excluding cancelled/completed/no-show', () => {
    const load = calculateExpectedPatientLoad(mockAppointments, 'hosp-1', targetDate);
    // Only apt-1 is 'confirmed'
    expect(load.count).toBe(1);
    expect(load.intervalLabel).toContain('Confirmed Bookings');
  });

  it('calculates current waiting crowd strictly counting checked_in and called, separating in_service and completed', () => {
    const breakdown = calculateQueueBreakdown(mockAppointments, 'hosp-1', targetDate);
    // checked_in (apt-2) + called (apt-3) = 2
    expect(breakdown.waitingCount).toBe(2);
    // in_service (apt-4) = 1
    expect(breakdown.inServiceCount).toBe(1);
    // completed (apt-5) = 1
    expect(breakdown.completedCount).toBe(1);
    // cancelled (apt-6) = 1
    expect(breakdown.cancelledCount).toBe(1);
    // no_show (apt-7) = 1
    expect(breakdown.noShowCount).toBe(1);
  });

  it('determines crowd level according to capacity thresholds', () => {
    // 1 counter: low <= 2, mod <= 5, high > 5
    expect(determineCrowdLevel(1, 1)).toBe('low');
    expect(determineCrowdLevel(2, 1)).toBe('low');
    expect(determineCrowdLevel(4, 1)).toBe('moderate');
    expect(determineCrowdLevel(7, 1)).toBe('high');

    // 2 counters: low <= 4, mod <= 10, high > 10
    expect(determineCrowdLevel(3, 2)).toBe('low');
    expect(determineCrowdLevel(8, 2)).toBe('moderate');
    expect(determineCrowdLevel(12, 2)).toBe('high');
  });

  it('estimates waiting time range with multi-counter model and uncertainty bounds', () => {
    // 0 patients ahead: immediate (0 to 5 mins)
    const zeroWait = estimateWaitingTimeRange(0, 1, 15);
    expect(zeroWait.minMins).toBe(0);
    expect(zeroWait.maxMins).toBe(5);

    // 4 patients ahead, 1 counter, 15 mins avg: central = 60 mins -> [48, 78]
    const singleWait = estimateWaitingTimeRange(4, 1, 15);
    expect(singleWait.minMins).toBeGreaterThan(40);
    expect(singleWait.maxMins).toBeLessThan(90);
    expect(singleWait.maxMins).toBeGreaterThan(singleWait.minMins);

    // 4 patients ahead, 2 counters, 15 mins avg: central = 30 mins -> [24, 39]
    const multiWait = estimateWaitingTimeRange(4, 2, 15);
    expect(multiWait.minMins).toBeLessThan(singleWait.minMins);
  });

  it('evaluates data freshness and flags stale verification timestamps', () => {
    const fixedNow = new Date('2026-10-14T12:00:00Z');

    // 5 minutes ago -> recent
    const recent = evaluateFreshness('2026-10-14T11:55:00Z', fixedNow);
    expect(recent.status).toBe('recent');
    expect(recent.isStale).toBe(false);

    // 30 minutes ago -> aging
    const aging = evaluateFreshness('2026-10-14T11:30:00Z', fixedNow);
    expect(aging.status).toBe('aging');
    expect(aging.isStale).toBe(false);

    // 90 minutes ago -> stale
    const stale = evaluateFreshness('2026-10-14T10:30:00Z', fixedNow);
    expect(stale.status).toBe('stale');
    expect(stale.isStale).toBe(true);

    // null / undefined -> unknown
    const unknown = evaluateFreshness(null, fixedNow);
    expect(unknown.status).toBe('unknown');
    expect(unknown.isStale).toBe(true);
  });

  it('calculates Haversine distance correctly between Hyderabad coordinates', () => {
    // Jubilee Hills (~ 17.4319, 78.4073) to Somajiguda (~ 17.4243, 78.4552) ~ 5 km
    const dist = calculateDistanceKm(
      { latitude: 17.4319, longitude: 78.4073 },
      { latitude: 17.4243, longitude: 78.4552 }
    );
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(7);
    expect(formatDistance(dist)).toMatch(/^[0-9.]+\s*km$/);
    expect(formatDistance(0.5)).toBe('500 m');
  });
});
