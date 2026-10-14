import React, { useState } from 'react';
import { Hospital, Doctor, Appointment } from '../types';
import { useTranslation } from '../i18n';
import { createAppointment } from '../lib/storage';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  AlertTriangle,
  Stethoscope,
  Copy,
  Check,
} from 'lucide-react';

interface BookingModalProps {
  hospital: Hospital;
  doctors: Doctor[];
  preselectedDoctorId?: string;
  onClose: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  hospital,
  doctors,
  preselectedDoctorId,
  onClose,
  onBookingSuccess,
}) => {
  const { t, language } = useTranslation();

  const availableDoctors = doctors.filter((d) => d.hospital_id === hospital.id && d.is_available);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    preselectedDoctorId || (availableDoctors[0]?.id ?? '')
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Time slots generation based on doctor working hours
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const generateTimeSlots = () => {
    if (!selectedDoctor) return [];
    const slots = [];
    // Generate slots: 09:00 to 17:00
    const startHour = parseInt(selectedDoctor.start_time.split(':')[0], 10) || 9;
    const endHour = parseInt(selectedDoctor.end_time.split(':')[0], 10) || 16;

    for (let h = startHour; h < endHour; h++) {
      const hourStr = h.toString().padStart(2, '0');
      slots.push({
        start: `${hourStr}:00`,
        end: `${hourStr}:15`,
        label: `${hourStr}:00 - ${hourStr}:15`,
      });
      slots.push({
        start: `${hourStr}:30`,
        end: `${hourStr}:45`,
        label: `${hourStr}:30 - ${hourStr}:45`,
      });
    }
    return slots;
  };

  const slots = generateTimeSlots();
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string }>(
    slots[0] || { start: '10:00', end: '10:15' }
  );

  // Patient Info Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [patientAge, setPatientAge] = useState<number>(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDoctorId) {
      setErrorMessage('Please select a doctor.');
      return;
    }
    if (!patientName.trim()) {
      setErrorMessage(t('full_name') + ' is required.');
      return;
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      setErrorMessage(t('phone_number') + ' must be at least 10 digits.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = createAppointment({
        hospitalId: hospital.id,
        doctorId: selectedDoctorId,
        patientName,
        patientPhone,
        patientGender,
        patientAge,
        appointmentDate: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        maxSlotCapacity: 3,
      });

      if (!result.success || !result.appointment) {
        setErrorMessage(result.error || t('error_occurred'));
        setIsSubmitting(false);
        return;
      }

      setConfirmedBooking(result.appointment);
      onBookingSuccess(result.appointment);
    } catch (err: any) {
      setErrorMessage(err.message || t('error_occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReference = () => {
    if (confirmedBooking) {
      navigator.clipboard.writeText(confirmedBooking.booking_reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {language === 'te' && hospital.name_te ? hospital.name_te : hospital.name}
            </h3>
            <p className="text-teal-100 text-xs mt-0.5">{t('schedule_appointment')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition text-teal-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {confirmedBooking ? (
            /* Success confirmation screen */
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-800">{t('booking_confirmed')}</h4>
                <p className="text-xs text-slate-600 mt-1">{t('booking_reference_hint')}</p>
              </div>

              {/* Reference Card */}
              <div className="bg-slate-50 border-2 border-dashed border-teal-500 rounded-xl p-4 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {t('booking_reference_label')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-extrabold text-teal-800 tracking-wider">
                    {confirmedBooking.booking_reference}
                  </span>
                  <button
                    onClick={copyReference}
                    title="Copy Code"
                    className="p-1.5 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 w-full justify-around">
                  <span>
                    Queue Number: <strong className="text-slate-800">#{confirmedBooking.queue_number}</strong>
                  </span>
                  <span>
                    Time: <strong className="text-slate-800">{confirmedBooking.start_time}</strong>
                  </span>
                </div>
              </div>

              <div className="text-left text-xs bg-teal-50 p-3 rounded-lg border border-teal-200 text-teal-900 space-y-1">
                <p>
                  <strong>Patient:</strong> {confirmedBooking.patient_name} ({confirmedBooking.patient_phone})
                </p>
                <p>
                  <strong>Doctor:</strong> {selectedDoctor?.name} ({selectedDoctor?.specialty})
                </p>
                <p>
                  <strong>Date:</strong> {confirmedBooking.appointment_date}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition shadow-sm"
              >
                {t('close')}
              </button>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Doctor Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  {t('select_doctor')}
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {availableDoctors.length === 0 ? (
                    <option value="">No doctors currently available</option>
                  ) : (
                    availableDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} — {doc.specialty} (₹{doc.consultation_fee})
                      </option>
                    ))
                  )}
                </select>
                {selectedDoctor && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    {selectedDoctor.qualification} • {selectedDoctor.experience_years} yrs exp.
                  </p>
                )}
              </div>

              {/* 2. Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    {t('select_date')}
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    {t('select_slot')}
                  </label>
                  <select
                    value={selectedSlot.start}
                    onChange={(e) => {
                      const match = slots.find((s) => s.start === e.target.value);
                      if (match) setSelectedSlot(match);
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {slots.map((s) => (
                      <option key={s.start} value={s.start}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Patient Details */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <span className="text-xs font-semibold text-slate-800 block">
                  {t('patient_details')}
                </span>

                <div>
                  <label className="block text-xs text-slate-600 mb-0.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {t('full_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-600 mb-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {t('phone_number')} *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit number"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-0.5">{t('age')}</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={patientAge}
                      onChange={(e) => setPatientAge(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">{t('gender')}</label>
                  <div className="flex gap-4 text-xs text-slate-700">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={patientGender === 'male'}
                        onChange={() => setPatientGender('male')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t('male')}</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={patientGender === 'female'}
                        onChange={() => setPatientGender('female')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t('female')}</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={patientGender === 'other'}
                        onChange={() => setPatientGender('other')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t('other')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableDoctors.length === 0}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? t('loading') : t('confirm_booking')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
