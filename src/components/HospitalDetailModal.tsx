import React from 'react';
import { Hospital, Doctor, CrowdMetrics } from '../types';
import { useTranslation } from '../i18n';
import { CrowdBadge } from './CrowdBadge';
import { FreshnessBadge } from './FreshnessBadge';
import {
  X,
  MapPin,
  Phone,
  Globe,
  Clock,
  ShieldCheck,
  Stethoscope,
  Users,
  Timer,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface HospitalDetailModalProps {
  hospital: Hospital;
  doctors: Doctor[];
  crowdMetrics: CrowdMetrics;
  distanceKm: number;
  onClose: () => void;
  onBookAppointment: (doctorId?: string) => void;
}

export const HospitalDetailModal: React.FC<HospitalDetailModalProps> = ({
  hospital,
  doctors,
  crowdMetrics,
  distanceKm,
  onClose,
  onBookAppointment,
}) => {
  const { t, language } = useTranslation();

  const hospitalDoctors = doctors.filter((d) => d.hospital_id === hospital.id);

  const displayName = language === 'te' && hospital.name_te ? hospital.name_te : hospital.name;
  const displayAddress =
    language === 'te' && hospital.address_te ? hospital.address_te : hospital.address;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto my-6">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {hospital.is_verified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  {t('verified_badge')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {t('sample_data_badge')}
                </span>
              )}
              <FreshnessBadge
                verifiedAt={hospital.verified_at}
                updatedAt={hospital.updated_at}
              />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{displayAddress}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Real-time Crowd & Queue Analysis Banner */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-2xl p-4 border border-teal-100/80 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Live Hospital Patient Load & Crowd Analytics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">
                  {t('waiting_patients')}
                </span>
                <span className="text-xl font-extrabold text-teal-700">
                  {crowdMetrics.waiting_count}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Checked In & Called</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">
                  {t('in_service_now')}
                </span>
                <span className="text-xl font-extrabold text-blue-700">
                  {crowdMetrics.in_service_count}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">In Consultation</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">
                  {t('estimated_wait_time')}
                </span>
                <span className="text-xl font-extrabold text-amber-600">
                  {crowdMetrics.estimated_wait_time_min}-{crowdMetrics.estimated_wait_time_max}m
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {hospital.active_counters} Active Counters
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block">
                  {t('expected_patient_load')}
                </span>
                <span className="text-xl font-extrabold text-slate-800">
                  {crowdMetrics.expected_patient_load}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Confirmed Upcoming</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-teal-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Crowd Level:</span>
                <CrowdBadge level={crowdMetrics.crowd_level} source={crowdMetrics.source} />
              </div>
              <span className="text-[11px] text-slate-500">
                Rolling avg consult: <strong>{crowdMetrics.rolling_avg_service_mins} mins</strong>
              </span>
            </div>
          </div>

          {/* Contact & Hours Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="font-semibold">{t('operating_hours')}:</span>
              </div>
              <p className="text-slate-600 pl-6">{hospital.operating_hours}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-teal-600" />
                <span className="font-semibold">Helpline & Reception:</span>
              </div>
              <p className="text-slate-600 pl-6">
                Reception: <a href={`tel:${hospital.contact_number}`} className="text-teal-700 font-medium hover:underline">{hospital.contact_number}</a>
                {hospital.emergency_number && (
                  <span className="block text-rose-600 font-semibold mt-0.5">
                    Emergency: {hospital.emergency_number}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Specialties List */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              {t('specialties')} & Clinical Departments
            </h4>
            <div className="flex flex-wrap gap-2">
              {hospital.specialties.map((spec) => (
                <span
                  key={spec}
                  className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-medium"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Doctor Roster & Directory */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Medical Staff & Doctor Availability
              </h4>
              <span className="text-xs text-slate-500">
                {hospitalDoctors.filter((d) => d.is_available).length} of {hospitalDoctors.length} available
              </span>
            </div>

            <div className="space-y-3">
              {hospitalDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-slate-900 text-sm">{doc.name}</h5>
                      {doc.is_available ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t('available')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          {t('on_leave')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-teal-700 mt-0.5">
                      {doc.specialty} • {doc.qualification}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.experience_years} yrs exp. • Fee: ₹{doc.consultation_fee} • Working Hours: {doc.start_time} - {doc.end_time}
                    </p>
                    {doc.status_note && (
                      <p className="text-[11px] text-slate-600 italic mt-0.5 bg-slate-50 px-2 py-0.5 rounded inline-block">
                        Note: {doc.status_note}
                      </p>
                    )}
                  </div>

                  <button
                    disabled={!doc.is_available}
                    onClick={() => onBookAppointment(doc.id)}
                    className="py-2 px-4 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {t('book_appointment')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Coordinates: {hospital.latitude.toFixed(4)}, {hospital.longitude.toFixed(4)}
          </div>
          <button
            onClick={() => onBookAppointment()}
            className="py-2.5 px-6 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition shadow-sm"
          >
            {t('book_appointment')}
          </button>
        </div>
      </div>
    </div>
  );
};
