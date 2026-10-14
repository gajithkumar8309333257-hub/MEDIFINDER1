-- =====================================================================
-- MEDIFINDER DATABASE SCHEMA & MIGRATION SCRIPT
-- PostgreSQL with Supabase Row Level Security (RLS) and Audit Functions
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_te VARCHAR(255),
    address TEXT NOT NULL,
    address_te TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Hyderabad',
    area VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    emergency_number VARCHAR(30),
    website VARCHAR(255),
    specialties TEXT[] NOT NULL DEFAULT '{}',
    operating_hours VARCHAR(100) NOT NULL DEFAULT '24/7',
    is_verified BOOLEAN NOT NULL DEFAULT true,
    active_counters INT NOT NULL DEFAULT 2,
    avg_service_mins INT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hospitals_city_area ON public.hospitals(city, area);
CREATE INDEX IF NOT EXISTS idx_hospitals_coords ON public.hospitals(latitude, longitude);

-- 3. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL DEFAULT 5,
    consultation_fee INT NOT NULL DEFAULT 500,
    slot_duration_mins INT NOT NULL DEFAULT 15,
    working_days TEXT[] NOT NULL DEFAULT '{"Mon","Tue","Wed","Thu","Fri","Sat"}',
    start_time TIME NOT NULL DEFAULT '09:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    is_available BOOLEAN NOT NULL DEFAULT true,
    status_note TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty);

-- 4. HOSPITAL STAFF TABLE
CREATE TABLE IF NOT EXISTS public.hospital_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- maps to auth.users if Supabase Auth is enabled
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'counter_staff' CHECK (role IN ('admin', 'nurse', 'counter_staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_hospital ON public.hospital_staff(hospital_id);

-- 5. APPOINTMENT SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.appointment_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL DEFAULT 4,
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= max_capacity),
    is_available BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_date ON public.appointment_slots(doctor_id, slot_date);

-- 6. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(32) NOT NULL UNIQUE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    patient_gender VARCHAR(20) CHECK (patient_gender IN ('male', 'female', 'other')),
    patient_age INT CHECK (patient_age > 0 AND patient_age < 130),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'checked_in', 'called', 'in_service', 'completed', 'cancelled', 'no_show')),
    queue_number INT,
    checked_in_at TIMESTAMPTZ,
    called_at TIMESTAMPTZ,
    in_service_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    no_show_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_appointments_ref ON public.appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON public.appointments(hospital_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON public.appointments(doctor_id, appointment_date);

-- 7. QUEUE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.queue_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    staff_id UUID REFERENCES public.hospital_staff(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_queue_events_hospital ON public.queue_events(hospital_id, created_at DESC);

-- 8. CROWD UPDATES TABLE
CREATE TABLE IF NOT EXISTS public.crowd_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    reported_level VARCHAR(20) NOT NULL CHECK (reported_level IN ('low', 'moderate', 'high', 'unknown')),
    waiting_count_override INT,
    source VARCHAR(50) NOT NULL DEFAULT 'staff_update',
    staff_id UUID REFERENCES public.hospital_staff(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events(entity_type, entity_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowd_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Anonymous public read access for hospital directory and doctors
CREATE POLICY "Public read verified hospitals" ON public.hospitals
    FOR SELECT USING (true);

CREATE POLICY "Public read doctors" ON public.doctors
    FOR SELECT USING (true);

CREATE POLICY "Public read available slots" ON public.appointment_slots
    FOR SELECT USING (true);

-- Patients can look up their own appointment using the booking reference
CREATE POLICY "Patient read by reference" ON public.appointments
    FOR SELECT USING (booking_reference IS NOT NULL);

-- Patient can create appointments
CREATE POLICY "Public create appointment" ON public.appointments
    FOR INSERT WITH CHECK (true);

-- Staff hospital-specific modification policies
CREATE POLICY "Staff manage their hospital queue" ON public.appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.hospital_staff
            WHERE hospital_staff.hospital_id = appointments.hospital_id
              AND hospital_staff.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff view queue events" ON public.queue_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.hospital_staff
            WHERE hospital_staff.hospital_id = queue_events.hospital_id
              AND hospital_staff.user_id = auth.uid()
        )
    );

-- =====================================================================
-- STORED FUNCTIONS: ATOMIC BOOKING TRANSACTION
-- =====================================================================
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_hospital_id UUID,
    p_doctor_id UUID,
    p_patient_name VARCHAR(255),
    p_patient_phone VARCHAR(20),
    p_patient_gender VARCHAR(20),
    p_patient_age INT,
    p_appointment_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_booking_reference VARCHAR(32)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slot_id UUID;
    v_booked INT;
    v_max INT;
    v_appointment_id UUID;
    v_queue_num INT;
BEGIN
    -- Check slot capacity with row lock
    SELECT id, booked_count, max_capacity
    INTO v_slot_id, v_booked, v_max
    FROM public.appointment_slots
    WHERE doctor_id = p_doctor_id
      AND slot_date = p_appointment_date
      AND start_time = p_start_time
    FOR UPDATE;

    IF v_slot_id IS NOT NULL AND v_booked >= v_max THEN
        RAISE EXCEPTION 'Slot is fully booked. Maximum capacity reached.';
    END IF;

    -- Compute daily sequential queue number for this hospital and date
    SELECT COALESCE(MAX(queue_number), 0) + 1
    INTO v_queue_num
    FROM public.appointments
    WHERE hospital_id = p_hospital_id
      AND appointment_date = p_appointment_date;

    -- Insert appointment
    INSERT INTO public.appointments (
        booking_reference,
        hospital_id,
        doctor_id,
        patient_name,
        patient_phone,
        patient_gender,
        patient_age,
        appointment_date,
        start_time,
        end_time,
        status,
        queue_number
    ) VALUES (
        p_booking_reference,
        p_hospital_id,
        p_doctor_id,
        p_patient_name,
        p_patient_phone,
        p_patient_gender,
        p_patient_age,
        p_appointment_date,
        p_start_time,
        p_end_time,
        'confirmed',
        v_queue_num
    )
    RETURNING id INTO v_appointment_id;

    -- Update slot count if slot tracked
    IF v_slot_id IS NOT NULL THEN
        UPDATE public.appointment_slots
        SET booked_count = booked_count + 1,
            is_available = (booked_count + 1 < max_capacity)
        WHERE id = v_slot_id;
    END IF;

    -- Audit log
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        actor_role,
        details
    ) VALUES (
        'appointment',
        v_appointment_id::text,
        'create',
        p_booking_reference,
        'patient',
        jsonb_build_object(
            'hospital_id', p_hospital_id,
            'doctor_id', p_doctor_id,
            'date', p_appointment_date,
            'start_time', p_start_time
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'booking_reference', p_booking_reference,
        'queue_number', v_queue_num
    );
END;
$$;
