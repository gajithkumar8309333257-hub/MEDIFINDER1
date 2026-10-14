import React, { useState } from 'react';
import { Appointment, Hospital, Doctor } from '../types';
import { useTranslation } from '../i18n';
import {
  getAppointmentByReference,
  cancelAppointmentByPatient,
} from '../lib/storage';
import { FreshnessBadge } from '../components/FreshnessBadge';
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  XCircle,
  Timer,
  Users,
} from 'lucide-react';

interface AppointmentsViewProps {
  userAppointments: Appointment[];
  hospitals: Hospital[];
  doctors: Doctor[];
  allAppointments: Appointment[];
  onRefresh: () => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  userAppointments,
  hospitals,
  doctors,
  allAppointments,
  onRefresh,
}) => {
  const { t } = useTranslation();

  // Search by reference code
  const [refQuery, setRefQuery] = useState('');
  const [searchedAppointment, setSearchedAppointment] = useState<Appointment | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Cancellation modal
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    if (!refQuery.trim()) {
      setSearchError('Please enter a booking reference code.');
      return;
    }

    const found = getAppointmentByReference(refQuery.trim());
    if (!found) {
      setSearchError(`No booking found matching reference: "${refQuery.trim()}".`);
      setSearchedAppointment(null);
    } else {
      setSearchedAppointment(found);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancellingAppt) return;
    setCancelError(null);

    const res = cancelAppointmentByPatient(
      cancellingAppt.booking_reference,
      cancelReason.trim() || 'Cancelled by patient'
    );

    if (!res.success) {
      setCancelError(res.error || 'Failed to cancel appointment.');
      return;
    }

    setCancellingAppt(null);
    setCancelReason('');
    onRefresh();

    // If currently displaying searched appt, update it
    if (searchedAppointment?.id === cancellingAppt.id) {
      setSearchedAppointment(getAppointmentByReference(cancellingAppt.booking_reference));
    }
  };

  // Combine user appointments from props with any searched appointment
  const displayList = [...userAppointments];
  if (
    searchedAppointment &&
    !displayList.some((a) => a.id === searchedAppointment.id)
  ) {
    displayList.unshift(searchedAppointment);
  }

  // Calculate queue position for a checked-in appointment
  const getQueuePosition = (apt: Appointment) => {
    if (apt.status !== 'checked_in' && apt.status !== 'called') {
      return null;
    }

    const checkedInAhead = allAppointments.filter(
      (a) =>
        a.hospital_id === apt.hospital_id &&
        a.appointment_date === apt.appointment_date &&
        (a.status === 'checked_in' || a.status === 'called') &&
        new Date(a.checked_in_at || a.created_at).getTime() <
          new Date(apt.checked_in_at || apt.created_at).getTime()
    );

    return checkedInAhead.length;
  };

  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {t('status_confirmed')}
          </span>
        );
      case 'checked_in':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            {t('status_checked_in')}
          </span>
        );
      case 'called':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 font-bold">
            {t('status_called')}
          </span>
        );
      case 'in_service':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            {t('status_in_service')}
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {t('status_completed')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {t('status_cancelled')}
          </span>
        );
      case 'no_show':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {t('status_no_show')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('my_bookings_title')}</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track real-time queue position, estimated waiting duration, and appointment details.
        </p>
      </div>

      {/* Reference Lookup Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <span className="text-xs font-bold text-slate-700 block mb-2">
          {t('lookup_by_ref')}
        </span>
        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('enter_ref_code')}
              value={refQuery}
              onChange={(e) => setRefQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-teal-600 text-white font-semibold text-xs rounded-xl hover:bg-teal-700 transition shadow-2xs"
          >
            {t('search_ref_btn')}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {searchError}
          </p>
        )}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {displayList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">{t('no_active_bookings')}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your booked appointments will appear here with live queue tracking.
            </p>
          </div>
        ) : (
          displayList.map((apt) => {
            const hosp = hospitals.find((h) => h.id === apt.hospital_id);
            const doc = doctors.find((d) => d.id === apt.doctor_id);
            const aheadCount = getQueuePosition(apt);

            const isCancellable = apt.status === 'confirmed' || apt.status === 'checked_in';

            return (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
              >
                {/* Top Bar: Reference & Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Ref:</span>
                    <span className="font-mono font-bold text-sm text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 tracking-wider">
                      {apt.booking_reference}
                    </span>
                  </div>
                  <div>{renderStatusBadge(apt.status)}</div>
                </div>

                {/* Queue Alert Banner if Checked In */}
                {aheadCount !== null && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-600" />
                      <div>
                        <span className="text-xs font-bold text-amber-900 block">
                          Queue Number: #{apt.queue_number}
                        </span>
                        <span className="text-[11px] text-amber-800">
                          {aheadCount === 0
                            ? 'You are next in line! Please wait near the consultation room.'
                            : `${aheadCount} ${t('ahead_of_you')}.`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-amber-700 block">Estimated Wait</span>
                      <span className="text-sm font-extrabold text-amber-900">
                        ~{aheadCount * (hosp?.avg_service_mins || 12)} mins
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 text-sm">{hosp?.name}</h3>
                    <p className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{hosp?.address}</span>
                    </p>
                    <p className="text-slate-600 font-medium">
                      Doctor: <strong className="text-slate-800">{doc?.name}</strong> ({doc?.specialty})
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:border-slate-100 sm:pl-4">
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>Date: <strong>{apt.appointment_date}</strong></span>
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Scheduled Slot: <strong>{apt.start_time} - {apt.end_time}</strong></span>
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>Patient: <strong>{apt.patient_name}</strong> ({apt.patient_phone})</span>
                    </p>
                  </div>
                </div>

                {/* Cancellation & Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Booked on: {new Date(apt.created_at).toLocaleDateString()}
                  </span>

                  {isCancellable && (
                    <button
                      onClick={() => setCancellingAppt(apt)}
                      className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t('cancel_appointment')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation Confirmation Dialog */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">{t('cancel_appointment')}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {t('cancel_confirm')} This will release your appointment slot ({cancellingAppt.start_time}) for other patients.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule change, feeling better, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {cancelError && (
              <p className="text-xs text-rose-600">{cancelError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancellingAppt(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('back')}
              </button>
              <button
                onClick={handleCancelSubmit}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
