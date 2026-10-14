import {
  Hospital,
  Doctor,
  Appointment,
  AppointmentStatus,
  QueueEvent,
  AuditEvent,
  CrowdLevel,
} from '../types';
import {
  INITIAL_HOSPITALS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
} from '../data/initialData';

const STORAGE_KEYS = {
  HOSPITALS: 'medifinder_hospitals_v1',
  DOCTORS: 'medifinder_doctors_v1',
  APPOINTMENTS: 'medifinder_appointments_v1',
  QUEUE_EVENTS: 'medifinder_queue_events_v1',
  AUDIT_EVENTS: 'medifinder_audit_events_v1',
};

// BroadcastChannel for cross-tab real-time sync
const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('medifinder_realtime_events')
    : null;

type StorageChangeCallback = (payload: { type: string; timestamp: string }) => void;
const subscribers: Set<StorageChangeCallback> = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    subscribers.forEach((cb) => cb(event.data));
  };
}

function notifyChange(type: string) {
  const payload = { type, timestamp: new Date().toISOString() };
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // ignore message channel errors
    }
  }
  subscribers.forEach((cb) => cb(payload));
}

export function subscribeToRealtimeUpdates(callback: StorageChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// -----------------------------------------------------------------
// Storage Helpers
// -----------------------------------------------------------------
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save to storage key: ${key}`, err);
  }
}

// -----------------------------------------------------------------
// Domain Operations
// -----------------------------------------------------------------
export function getHospitals(): Hospital[] {
  return loadFromStorage<Hospital[]>(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
}

export function getDoctors(hospitalId?: string): Doctor[] {
  const all = loadFromStorage<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
  if (hospitalId) {
    return all.filter((d) => d.hospital_id === hospitalId);
  }
  return all;
}

export function getAppointments(hospitalId?: string, date?: string): Appointment[] {
  const all = loadFromStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  return all.filter((apt) => {
    if (hospitalId && apt.hospital_id !== hospitalId) return false;
    if (date && apt.appointment_date !== date) return false;
    return true;
  });
}

export function getAppointmentByReference(referenceCode: string): Appointment | null {
  const normalized = referenceCode.trim().toUpperCase();
  const all = loadFromStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  return all.find((apt) => apt.booking_reference.toUpperCase() === normalized) || null;
}

export interface CreateBookingParams {
  hospitalId: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  patientGender?: 'male' | 'female' | 'other';
  patientAge?: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  maxSlotCapacity?: number; // default: 3
}

export function createAppointment(params: CreateBookingParams): {
  success: boolean;
  appointment?: Appointment;
  error?: string;
} {
  const {
    hospitalId,
    doctorId,
    patientName,
    patientPhone,
    patientGender,
    patientAge,
    appointmentDate,
    startTime,
    endTime,
    maxSlotCapacity = 3,
  } = params;

  if (!patientName.trim()) {
    return { success: false, error: 'Patient name is required.' };
  }
  if (!patientPhone.trim() || patientPhone.trim().length < 10) {
    return { success: false, error: 'Valid 10-digit phone number is required.' };
  }

  const appointments = loadFromStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);

  // 1. Capacity Enforcement: Count existing confirmed bookings for this slot
  const slotBookings = appointments.filter(
    (apt) =>
      apt.doctor_id === doctorId &&
      apt.appointment_date === appointmentDate &&
      apt.start_time === startTime &&
      apt.status !== 'cancelled'
  );

  if (slotBookings.length >= maxSlotCapacity) {
    return {
      success: false,
      error: `This time slot is fully booked (capacity: ${maxSlotCapacity}). Please select another slot.`,
    };
  }

  // 2. Prevent duplicate bookings for same patient & doctor on same day
  const duplicate = appointments.find(
    (apt) =>
      apt.doctor_id === doctorId &&
      apt.appointment_date === appointmentDate &&
      apt.patient_phone.trim() === patientPhone.trim() &&
      apt.status !== 'cancelled'
  );

  if (duplicate) {
    return {
      success: false,
      error: `An appointment for ${patientPhone} with this doctor is already active on ${appointmentDate}. Reference: ${duplicate.booking_reference}`,
    };
  }

  // 3. Compute sequential daily queue number
  const dailyHospitalBookings = appointments.filter(
    (apt) => apt.hospital_id === hospitalId && apt.appointment_date === appointmentDate
  );
  const queueNumber = dailyHospitalBookings.length + 1;

  // 4. Generate opaque, unique booking reference code (e.g. MF-2026-XXXX)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingReference = `MF-2026-${randomSuffix}`;

  const nowIso = new Date().toISOString();
  const newAppointment: Appointment = {
    id: `apt-${Date.now()}-${randomSuffix}`,
    booking_reference: bookingReference,
    hospital_id: hospitalId,
    doctor_id: doctorId,
    patient_name: patientName.trim(),
    patient_phone: patientPhone.trim(),
    patient_gender: patientGender,
    patient_age: patientAge,
    appointment_date: appointmentDate,
    start_time: startTime,
    end_time: endTime,
    status: 'confirmed',
    queue_number: queueNumber,
    created_at: nowIso,
    updated_at: nowIso,
  };

  appointments.push(newAppointment);
  saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);

  // Record audit log
  recordAuditEvent({
    entity_type: 'appointment',
    entity_id: newAppointment.id,
    action: 'create',
    actor_id: bookingReference,
    actor_role: 'patient',
    details: {
      hospitalId,
      doctorId,
      date: appointmentDate,
      startTime,
      queueNumber,
    },
  });

  notifyChange('APPOINTMENT_CREATED');

  return {
    success: true,
    appointment: newAppointment,
  };
}

/**
 * Valid state transitions:
 * - confirmed -> checked_in, cancelled, no_show
 * - checked_in -> called, cancelled, no_show
 * - called -> in_service, cancelled, no_show
 * - in_service -> completed, cancelled
 */
export function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  staffId: string = 'staff-admin',
  notes?: string
): { success: boolean; appointment?: Appointment; error?: string } {
  const appointments = loadFromStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  const index = appointments.findIndex((a) => a.id === appointmentId);

  if (index === -1) {
    return { success: false, error: 'Appointment not found.' };
  }

  const target = appointments[index];
  const oldStatus = target.status;
  const nowIso = new Date().toISOString();

  // Validate state machine
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['called', 'in_service', 'cancelled', 'no_show'],
    called: ['in_service', 'checked_in', 'cancelled', 'no_show'],
    in_service: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
    no_show: ['checked_in'], // Grace period check-in if arrived late
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from ${oldStatus} to ${newStatus}.`,
    };
  }

  target.status = newStatus;
  target.updated_at = nowIso;

  if (newStatus === 'checked_in' && !target.checked_in_at) {
    target.checked_in_at = nowIso;
  } else if (newStatus === 'called') {
    target.called_at = nowIso;
  } else if (newStatus === 'in_service') {
    target.in_service_at = nowIso;
  } else if (newStatus === 'completed') {
    target.completed_at = nowIso;
  } else if (newStatus === 'cancelled') {
    target.cancelled_at = nowIso;
    target.cancellation_reason = notes || 'Cancelled by staff/patient';
  } else if (newStatus === 'no_show') {
    target.no_show_at = nowIso;
  }

  appointments[index] = target;
  saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);

  // Record queue event
  const queueEvents = loadFromStorage<QueueEvent[]>(STORAGE_KEYS.QUEUE_EVENTS, []);
  queueEvents.push({
    id: `qe-${Date.now()}`,
    hospital_id: target.hospital_id,
    appointment_id: target.id,
    from_status: oldStatus,
    to_status: newStatus,
    staff_id: staffId,
    notes,
    created_at: nowIso,
  });
  saveToStorage(STORAGE_KEYS.QUEUE_EVENTS, queueEvents);

  // Record audit log
  recordAuditEvent({
    entity_type: 'queue',
    entity_id: target.id,
    action: 'status_change',
    actor_id: staffId,
    actor_role: 'staff',
    details: {
      fromStatus: oldStatus,
      toStatus: newStatus,
      notes,
    },
  });

  notifyChange('QUEUE_UPDATED');

  return { success: true, appointment: target };
}

export function cancelAppointmentByPatient(
  bookingReference: string,
  reason: string = 'Cancelled by patient'
): { success: boolean; error?: string } {
  const apt = getAppointmentByReference(bookingReference);
  if (!apt) {
    return { success: false, error: 'Appointment reference not found.' };
  }
  if (apt.status === 'completed' || apt.status === 'cancelled') {
    return { success: false, error: `Cannot cancel appointment in '${apt.status}' status.` };
  }

  const res = updateAppointmentStatus(apt.id, 'cancelled', 'patient-self', reason);
  return { success: res.success, error: res.error };
}

export function updateHospitalCrowdOverride(
  hospitalId: string,
  reportedLevel: CrowdLevel,
  staffId: string = 'staff-admin'
): boolean {
  const hospitals = loadFromStorage<Hospital[]>(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
  const idx = hospitals.findIndex((h) => h.id === hospitalId);
  if (idx === -1) return false;

  const nowIso = new Date().toISOString();
  hospitals[idx].updated_at = nowIso;
  hospitals[idx].verified_at = nowIso; // Real-world staff verification confirmed
  saveToStorage(STORAGE_KEYS.HOSPITALS, hospitals);

  recordAuditEvent({
    entity_type: 'crowd',
    entity_id: hospitalId,
    action: 'override',
    actor_id: staffId,
    actor_role: 'staff',
    details: { reportedLevel, verified_at: nowIso },
  });

  notifyChange('CROWD_UPDATED');
  return true;
}

export function toggleDoctorAvailability(
  doctorId: string,
  isAvailable: boolean,
  statusNote?: string,
  staffId: string = 'staff-admin'
): boolean {
  const doctors = loadFromStorage<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
  const idx = doctors.findIndex((d) => d.id === doctorId);
  if (idx === -1) return false;

  const nowIso = new Date().toISOString();
  doctors[idx].is_available = isAvailable;
  doctors[idx].status_note = statusNote || (isAvailable ? 'On duty' : 'Off duty / On leave');
  doctors[idx].verified_at = nowIso;
  doctors[idx].updated_at = nowIso;

  saveToStorage(STORAGE_KEYS.DOCTORS, doctors);

  recordAuditEvent({
    entity_type: 'doctor',
    entity_id: doctorId,
    action: 'update',
    actor_id: staffId,
    actor_role: 'staff',
    details: { isAvailable, statusNote, verified_at: nowIso },
  });

  notifyChange('DOCTOR_UPDATED');
  return true;
}

export function recordAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): void {
  const events = loadFromStorage<AuditEvent[]>(STORAGE_KEYS.AUDIT_EVENTS, []);
  events.unshift({
    ...event,
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
  });
  // Keep last 100 events
  saveToStorage(STORAGE_KEYS.AUDIT_EVENTS, events.slice(0, 100));
}

export function getAuditEvents(): AuditEvent[] {
  return loadFromStorage<AuditEvent[]>(STORAGE_KEYS.AUDIT_EVENTS, []);
}

export function resetDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
  localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
  localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
  localStorage.setItem(STORAGE_KEYS.QUEUE_EVENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.AUDIT_EVENTS, JSON.stringify([]));
  notifyChange('DATA_RESET');
}
