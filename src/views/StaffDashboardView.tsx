import React, { useState } from 'react';
import { Hospital, Doctor, Appointment, CrowdLevel } from '../types';
import { useTranslation } from '../i18n';
import {
  updateAppointmentStatus,
  updateHospitalCrowdOverride,
  toggleDoctorAvailability,
  getAuditEvents,
} from '../lib/storage';
import { CrowdBadge } from '../components/CrowdBadge';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { computeHospitalCrowdMetrics } from '../lib/crowdEngine';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  PhoneForwarded,
  Stethoscope,
  Clock,
  History,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';

interface StaffDashboardViewProps {
  hospitals: Hospital[];
  doctors: Doctor[];
  appointments: Appointment[];
  onRefresh: () => void;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  hospitals,
  doctors,
  appointments,
  onRefresh,
}) => {
  const { t } = useTranslation();

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    hospitals[0]?.id || ''
  );

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);
  const hospitalDoctors = doctors.filter((d) => d.hospital_id === selectedHospitalId);

  const todayStr = new Date().toISOString().split('T')[0];
  const hospitalAppointmentsToday = appointments.filter(
    (a) => a.hospital_id === selectedHospitalId && a.appointment_date === todayStr
  );

  const [activeTab, setActiveTab] = useState<'queue' | 'roster' | 'audit'>('queue');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const crowdMetrics = selectedHospital
    ? computeHospitalCrowdMetrics(
        selectedHospital.id,
        appointments,
        selectedHospital.active_counters,
        selectedHospital.avg_service_mins,
        'queue_system',
        selectedHospital.verified_at,
        selectedHospital.updated_at
      )
    : null;

  // Queue actions
  const handleAdvanceStatus = (
    appointmentId: string,
    newStatus: Appointment['status']
  ) => {
    const res = updateAppointmentStatus(appointmentId, newStatus, 'staff-counter-1');
    if (res.success) {
      showToast(`Patient status updated to '${newStatus}'.`);
      onRefresh();
    } else {
      alert(res.error || 'Failed to update status.');
    }
  };

  // Crowd level override
  const handleCrowdOverride = (level: CrowdLevel) => {
    if (!selectedHospital) return;
    const ok = updateHospitalCrowdOverride(selectedHospital.id, level, 'staff-supervisor');
    if (ok) {
      showToast(`Crowd status updated to '${level}' and verified.`);
      onRefresh();
    }
  };

  // Doctor duty toggle
  const handleDoctorToggle = (doctorId: string, currentAvailable: boolean) => {
    const nextState = !currentAvailable;
    const note = nextState ? 'On duty at clinic' : 'On leave / In surgery';
    const ok = toggleDoctorAvailability(doctorId, nextState, note, 'staff-admin');
    if (ok) {
      showToast(`Doctor availability updated.`);
      onRefresh();
    }
  };

  const auditEvents = getAuditEvents();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Hospital Scope Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('staff_portal')}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              Authorized Staff
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time patient check-ins, consultation queue progression, and crowd monitoring.
          </p>
        </div>

        {/* Managing Hospital Selector */}
        <div className="w-full md:w-auto">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            {t('select_hospital')}:
          </label>
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="w-full md:w-80 py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            {hospitals.map((hosp) => (
              <option key={hosp.id} value={hosp.id}>
                {hosp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Hospital Real-Time Live Status Bar */}
      {crowdMetrics && selectedHospital && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">{selectedHospital.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <FreshnessBadge
                  verifiedAt={selectedHospital.verified_at}
                  updatedAt={selectedHospital.updated_at}
                />
                <span className="text-xs text-slate-400">
                  Counters: <strong>{selectedHospital.active_counters}</strong>
                </span>
              </div>
            </div>

            {/* Quick Crowd Override Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Quick Override:</span>
              <button
                onClick={() => handleCrowdOverride('low')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 transition"
              >
                Low
              </button>
              <button
                onClick={() => handleCrowdOverride('moderate')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900 transition"
              >
                Moderate
              </button>
              <button
                onClick={() => handleCrowdOverride('high')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 transition"
              >
                High
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center">
            <div>
              <span className="text-xs text-slate-400 block">{t('waiting_patients')}</span>
              <span className="text-2xl font-extrabold text-teal-400">
                {crowdMetrics.waiting_count}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('in_service_now')}</span>
              <span className="text-2xl font-extrabold text-blue-400">
                {crowdMetrics.in_service_count}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('expected_patient_load')}</span>
              <span className="text-2xl font-extrabold text-amber-400">
                {crowdMetrics.expected_patient_load}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">{t('estimated_wait_time')}</span>
              <span className="text-2xl font-extrabold text-white">
                {crowdMetrics.estimated_wait_time_min}-{crowdMetrics.estimated_wait_time_max}m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'queue'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('registered_patients_today')} ({hospitalAppointmentsToday.length})
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'roster'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          {t('doctor_duty_management')} ({hospitalDoctors.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'audit'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          {t('audit_trail')}
        </button>
      </div>

      {/* TAB 1: Live Patient Queue Management */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('live_queue_management')}
            </h3>
            <span className="text-xs text-slate-500">Date: {todayStr}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Queue #</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitalAppointmentsToday.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      {t('queue_empty')}
                    </td>
                  </tr>
                ) : (
                  hospitalAppointmentsToday.map((apt) => {
                    const doc = doctors.find((d) => d.id === apt.doctor_id);

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          #{apt.queue_number || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                          {apt.booking_reference}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {apt.patient_name}
                          </span>
                          <span className="text-[11px] text-slate-500">{apt.patient_phone}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{doc?.name || 'Assigned Doctor'}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">{apt.start_time}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              apt.status === 'in_service'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'called'
                                ? 'bg-purple-100 text-purple-800'
                                : apt.status === 'checked_in'
                                ? 'bg-amber-100 text-amber-800'
                                : apt.status === 'completed'
                                ? 'bg-slate-100 text-slate-700'
                                : apt.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {/* Step 1: Check in */}
                          {apt.status === 'confirmed' && (
                            <button
                              onClick={() => handleAdvanceStatus(apt.id, 'checked_in')}
                              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
                            >
                              {t('action_check_in')}
                            </button>
                          )}

                          {/* Step 2: Call patient */}
                          {apt.status === 'checked_in' && (
                            <button
                              onClick={() => handleAdvanceStatus(apt.id, 'called')}
                              className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                            >
                              {t('action_call')}
                            </button>
                          )}

                          {/* Step 3: Start Consultation */}
                          {(apt.status === 'called' || apt.status === 'checked_in') && (
                            <button
                              onClick={() => handleAdvanceStatus(apt.id, 'in_service')}
                              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
                            >
                              {t('action_start_service')}
                            </button>
                          )}

                          {/* Step 4: Complete Consultation */}
                          {apt.status === 'in_service' && (
                            <button
                              onClick={() => handleAdvanceStatus(apt.id, 'completed')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
                            >
                              {t('action_complete')}
                            </button>
                          )}

                          {/* Cancel / No-show buttons for incomplete */}
                          {apt.status !== 'completed' &&
                            apt.status !== 'cancelled' &&
                            apt.status !== 'no_show' && (
                              <button
                                onClick={() => handleAdvanceStatus(apt.id, 'no_show')}
                                title={t('action_no_show')}
                                className="px-2 py-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                {t('action_no_show')}
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Doctor Roster & Duty Management */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {t('doctor_duty_management')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitalDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                  <p className="text-xs text-teal-700 font-semibold">{doc.specialty}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hours: {doc.start_time} - {doc.end_time} • {doc.status_note}
                  </p>
                </div>

                <button
                  onClick={() => handleDoctorToggle(doc.id, doc.is_available)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                    doc.is_available
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {doc.is_available ? t('available') : t('on_leave')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('audit_trail')}
            </h3>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {auditEvents.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No audit events recorded yet.</p>
            ) : (
              auditEvents.map((ev) => (
                <div key={ev.id} className="p-3 text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 capitalize">
                      [{ev.entity_type}] {ev.action}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      By: <code className="bg-slate-100 px-1 rounded">{ev.actor_id}</code> ({ev.actor_role})
                    </p>
                    <pre className="text-[10px] text-slate-600 bg-slate-50 p-1 rounded mt-1 overflow-x-auto max-w-lg">
                      {JSON.stringify(ev.details)}
                    </pre>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
