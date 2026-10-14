import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHospitals,
  getDoctors,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentByReference,
  cancelAppointmentByPatient,
  resetDemoData,
  getAuditEvents,
} from '../lib/storage';

describe('Storage & Booking Engine Constraints', () => {
  beforeEach(() => {
    resetDemoData();
  });

  it('loads initial hospitals and doctors cleanly', () => {
    const hospitals = getHospitals();
    expect(hospitals.length).toBeGreaterThanOrEqual(5);

    const doctors = getDoctors();
    expect(doctors.length).toBeGreaterThanOrEqual(5);
  });

  it('successfully creates an appointment and generates an opaque reference code', () => {
    const result = createAppointment({
      hospitalId: 'hosp-apollo-jubilee',
      doctorId: 'doc-apollo-1',
      patientName: 'Test Patient',
      patientPhone: '9999988888',
      appointmentDate: '2026-10-15',
      startTime: '10:00',
      endTime: '10:15',
      maxSlotCapacity: 2,
    });

    expect(result.success).toBe(true);
    expect(result.appointment).toBeDefined();
    expect(result.appointment?.booking_reference).toMatch(/^MF-2026-\d{4}$/);
    expect(result.appointment?.status).toBe('confirmed');

    // Can look up by reference
    const lookedUp = getAppointmentByReference(result.appointment!.booking_reference);
    expect(lookedUp?.id).toBe(result.appointment!.id);
  });

  it('enforces maximum slot capacity and rejects bookings exceeding capacity', () => {
    const slotParams = {
      hospitalId: 'hosp-apollo-jubilee',
      doctorId: 'doc-apollo-1',
      appointmentDate: '2026-10-20',
      startTime: '11:00',
      endTime: '11:15',
      maxSlotCapacity: 2,
    };

    // First booking: success
    const res1 = createAppointment({
      ...slotParams,
      patientName: 'Patient A',
      patientPhone: '9991110001',
    });
    expect(res1.success).toBe(true);

    // Second booking: success (reaches capacity 2)
    const res2 = createAppointment({
      ...slotParams,
      patientName: 'Patient B',
      patientPhone: '9991110002',
    });
    expect(res2.success).toBe(true);

    // Third booking: must fail due to capacity limit
    const res3 = createAppointment({
      ...slotParams,
      patientName: 'Patient C',
      patientPhone: '9991110003',
    });
    expect(res3.success).toBe(false);
    expect(res3.error).toContain('fully booked');
  });

  it('prevents duplicate active booking for the same patient and doctor on the same date', () => {
    const params = {
      hospitalId: 'hosp-yashoda-somajiguda',
      doctorId: 'doc-yashoda-1',
      patientName: 'Same Person',
      patientPhone: '9888877777',
      appointmentDate: '2026-10-22',
      startTime: '10:00',
      endTime: '10:15',
    };

    const first = createAppointment(params);
    expect(first.success).toBe(true);

    const duplicate = createAppointment({
      ...params,
      startTime: '11:00', // Different time slot, but same doctor & date
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('already active');
  });

  it('enforces valid queue state transitions and rejects illegal skips', () => {
    const res = createAppointment({
      hospitalId: 'hosp-apollo-jubilee',
      doctorId: 'doc-apollo-1',
      patientName: 'Queue Patient',
      patientPhone: '9123456789',
      appointmentDate: '2026-10-14',
      startTime: '12:00',
      endTime: '12:15',
    });
    const aptId = res.appointment!.id;

    // Illegal: confirmed directly to completed (skipping check-in)
    const illegal = updateAppointmentStatus(aptId, 'completed');
    expect(illegal.success).toBe(false);
    expect(illegal.error).toContain('Invalid status transition');

    // Legal: confirmed -> checked_in
    const step1 = updateAppointmentStatus(aptId, 'checked_in');
    expect(step1.success).toBe(true);
    expect(step1.appointment?.status).toBe('checked_in');
    expect(step1.appointment?.checked_in_at).toBeDefined();

    // Legal: checked_in -> called
    const step2 = updateAppointmentStatus(aptId, 'called');
    expect(step2.success).toBe(true);
    expect(step2.appointment?.status).toBe('called');

    // Legal: called -> in_service
    const step3 = updateAppointmentStatus(aptId, 'in_service');
    expect(step3.success).toBe(true);
    expect(step3.appointment?.status).toBe('in_service');

    // Legal: in_service -> completed
    const step4 = updateAppointmentStatus(aptId, 'completed');
    expect(step4.success).toBe(true);
    expect(step4.appointment?.status).toBe('completed');
    expect(step4.appointment?.completed_at).toBeDefined();
  });

  it('allows patient to cancel an appointment and records audit log', () => {
    const res = createAppointment({
      hospitalId: 'hosp-apollo-jubilee',
      doctorId: 'doc-apollo-1',
      patientName: 'Cancel Test',
      patientPhone: '9111122222',
      appointmentDate: '2026-10-25',
      startTime: '14:00',
      endTime: '14:15',
    });
    const ref = res.appointment!.booking_reference;

    const cancelRes = cancelAppointmentByPatient(ref, 'Personal emergency');
    expect(cancelRes.success).toBe(true);

    const updated = getAppointmentByReference(ref);
    expect(updated?.status).toBe('cancelled');
    expect(updated?.cancelled_at).toBeDefined();

    const audit = getAuditEvents();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0].action).toBe('status_change');
  });
});
