// MediFinder Domain Types & Interfaces

export type AppointmentStatus =
  | 'confirmed'
  | 'checked_in'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'unknown';

export type CrowdSourceType =
  | 'queue_system' // check-ins and active queue
  | 'appointment_counts' // confirmed future bookings
  | 'staff_update' // authorized hospital staff manual report
  | 'patient_report' // crowd report submitted by users
  | 'demo_simulation'; // explicitly labeled simulated demonstration data

export type FreshnessStatus = 'recent' | 'aging' | 'stale' | 'unknown';

export interface Hospital {
  id: string;
  name: string;
  name_te?: string;
  address: string;
  address_te?: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  emergency_number?: string;
  website?: string;
  specialties: string[];
  operating_hours: string;
  is_verified: boolean;
  active_counters: number;
  avg_service_mins: number; // rolling average consultation duration
  created_at: string;
  updated_at: string;
  verified_at?: string;
}

export interface Doctor {
  id: string;
  hospital_id: string;
  name: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  slot_duration_mins: number;
  working_days: string[];
  start_time: string; // e.g. "09:00"
  end_time: string;   // e.g. "17:00"
  is_available: boolean;
  status_note?: string;
  verified_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  hospital_id: string;
  day_of_week: number; // 0-6 (Sunday to Saturday)
  start_time: string;
  end_time: string;
  max_patients_per_slot: number;
  is_active: boolean;
}

export interface AppointmentSlot {
  id: string;
  doctor_id: string;
  hospital_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  max_capacity: number;
  booked_count: number;
  is_available: boolean;
}

export interface Appointment {
  id: string;
  booking_reference: string; // e.g., MF-2026-XXXX
  hospital_id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  patient_gender?: 'male' | 'female' | 'other';
  patient_age?: number;
  appointment_date: string; // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time: string;         // HH:MM
  status: AppointmentStatus;
  queue_number?: number;
  checked_in_at?: string;
  called_at?: string;
  in_service_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  no_show_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEvent {
  id: string;
  hospital_id: string;
  appointment_id: string;
  from_status: AppointmentStatus | 'none';
  to_status: AppointmentStatus;
  staff_id?: string;
  notes?: string;
  created_at: string;
}

export interface CrowdMetrics {
  hospital_id: string;
  expected_patient_load: number; // confirmed future bookings in interval
  time_interval_label: string;    // e.g. "Next 4 hours" or "Today"
  waiting_count: number;          // checked_in + called patients waiting
  in_service_count: number;       // currently in consultation
  completed_today_count: number;  // completed today
  cancelled_today_count: number;  // cancelled today
  no_show_today_count: number;    // no show today
  crowd_level: CrowdLevel;
  estimated_wait_time_min: number; // lower bound in mins
  estimated_wait_time_max: number; // upper bound in mins
  active_counters: number;
  rolling_avg_service_mins: number;
  source: CrowdSourceType;
  last_verified_at?: string;
  last_updated_at: string;
  freshness: FreshnessStatus;
  is_stale: boolean;
}

export interface HospitalStaff {
  id: string;
  email: string;
  full_name: string;
  hospital_id: string;
  role: 'admin' | 'nurse' | 'counter_staff';
  is_active: boolean;
}

export interface AuditEvent {
  id: string;
  entity_type: 'appointment' | 'queue' | 'crowd' | 'doctor' | 'hospital';
  entity_id: string;
  action: 'create' | 'update' | 'status_change' | 'cancel' | 'override';
  actor_id: string;
  actor_role: string;
  details: Record<string, any>;
  created_at: string;
}

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}
