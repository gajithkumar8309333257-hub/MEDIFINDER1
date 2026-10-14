import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHospitals,
  getDoctors,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentByReference,
  resetDemoData,
} from '../lib/storage';
import {
  computeHospitalCrowdMetrics,
  calculateQueueBreakdown,
  calculateExpectedPatientLoad,
} from '../lib/crowdEngine';
import { evaluateFreshness } from '../lib/freshness';

describe('Hackathon End-to-End Workflow Scenario (Section 19)', () => {
  beforeEach(() => {
    resetDemoData();
  });

  it('executes full patient discovery, booking, staff queue progression, and crowd recalculation', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Step 1 & 2: User opens MediFinder, retrieves verified hospitals & doctors
    const hospitals = getHospitals();
    expect(hospitals.length).toBeGreaterThan(0);
    const targetHosp = hospitals.find((h) => h.id === 'hosp-apollo-jubilee')!;
    expect(targetHosp).toBeDefined();

    const doctors = getDoctors(targetHosp.id);
    const activeDoctor = doctors.find((d) => d.is_available)!;
    expect(activeDoctor).toBeDefined();

    // Step 3: Inspect freshness & crowd metrics before booking
    const initialAppointments = getAppointments();
    const initialMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      initialAppointments,
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system',
      targetHosp.verified_at,
      targetHosp.updated_at
    );
    expect(initialMetrics.freshness).toBe('recent');
    const initialExpectedLoad = initialMetrics.expected_patient_load;
    const initialWaitingCount = initialMetrics.waiting_count;

    // Step 4 & 5: Select doctor, slot, and confirm booking
    const bookingResult = createAppointment({
      hospitalId: targetHosp.id,
      doctorId: activeDoctor.id,
      patientName: 'Demo Patient',
      patientPhone: '9848011223',
      patientGender: 'male',
      patientAge: 35,
      appointmentDate: todayStr,
      startTime: '10:00',
      endTime: '10:15',
    });

    expect(bookingResult.success).toBe(true);
    const newApt = bookingResult.appointment!;
    expect(newApt.status).toBe('confirmed');
    expect(newApt.booking_reference).toMatch(/^MF-2026-\d{4}$/);

    // Step 6: Verify that expected future patient load incremented, but waiting crowd did NOT yet increment
    const postBookingAppointments = getAppointments();
    const postBookingMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      postBookingAppointments,
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system'
    );
    expect(postBookingMetrics.expected_patient_load).toBe(initialExpectedLoad + 1);
    expect(postBookingMetrics.waiting_count).toBe(initialWaitingCount); // Not checked in yet!

    // Step 7: Authorized Staff registers Patient Check-In
    const checkInResult = updateAppointmentStatus(newApt.id, 'checked_in', 'staff-counter-1');
    expect(checkInResult.success).toBe(true);
    expect(checkInResult.appointment?.status).toBe('checked_in');
    expect(checkInResult.appointment?.checked_in_at).toBeDefined();

    // Step 8: Patient is now checked in -> Waiting crowd increments!
    const postCheckInAppointments = getAppointments();
    const postCheckInMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      postCheckInAppointments,
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system'
    );
    expect(postCheckInMetrics.waiting_count).toBe(initialWaitingCount + 1);

    // Step 9: Staff calls patient ('called') -> still part of waiting crowd
    const callResult = updateAppointmentStatus(newApt.id, 'called', 'staff-counter-1');
    expect(callResult.success).toBe(true);
    const postCallMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      getAppointments(),
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system'
    );
    expect(postCallMetrics.waiting_count).toBe(initialWaitingCount + 1);

    // Step 10: Consultation begins ('in_service') -> Leaves waiting crowd, enters in-service count
    const serviceResult = updateAppointmentStatus(newApt.id, 'in_service', 'doc-apollo-1');
    expect(serviceResult.success).toBe(true);
    const inServiceMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      getAppointments(),
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system'
    );
    expect(inServiceMetrics.waiting_count).toBe(initialWaitingCount);
    expect(inServiceMetrics.in_service_count).toBeGreaterThanOrEqual(1);

    // Step 11: Consultation completes ('completed') -> Leaves in-service, increments completed today
    const completeResult = updateAppointmentStatus(newApt.id, 'completed', 'doc-apollo-1');
    expect(completeResult.success).toBe(true);
    const completedMetrics = computeHospitalCrowdMetrics(
      targetHosp.id,
      getAppointments(),
      targetHosp.active_counters,
      targetHosp.avg_service_mins,
      'queue_system'
    );
    expect(completedMetrics.waiting_count).toBe(initialWaitingCount);
    expect(completedMetrics.completed_today_count).toBeGreaterThanOrEqual(1);

    // Step 12: Verify patient lookup reflects completion
    const lookedUp = getAppointmentByReference(newApt.booking_reference);
    expect(lookedUp?.status).toBe('completed');
    expect(lookedUp?.completed_at).toBeDefined();
  });
});
