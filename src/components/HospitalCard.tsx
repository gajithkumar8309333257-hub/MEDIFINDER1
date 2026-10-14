import React from 'react';
import { Hospital, Doctor, CrowdMetrics } from '../types';
import { useTranslation } from '../i18n';
import { CrowdBadge } from './CrowdBadge';
import { FreshnessBadge } from './FreshnessBadge';
import { formatDistance } from '../lib/distance';
import {
  MapPin,
  Clock,
  Phone,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Users,
  Timer,
} from 'lucide-react';

interface HospitalCardProps {
  hospital: Hospital;
  distanceKm: number;
  crowdMetrics: CrowdMetrics;
  doctors: Doctor[];
  onSelect: () => void;
  onBookAppointment: () => void;
  isSelected?: boolean;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  distanceKm,
  crowdMetrics,
  doctors,
  onSelect,
  onBookAppointment,
  isSelected = false,
}) => {
  const { t, language } = useTranslation();

  const hospitalDoctors = doctors.filter((d) => d.hospital_id === hospital.id);
  const availableDoctors = hospitalDoctors.filter((d) => d.is_available);

  const displayName = language === 'te' && hospital.name_te ? hospital.name_te : hospital.name;
  const displayAddress =
    language === 'te' && hospital.address_te ? hospital.address_te : hospital.address;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md overflow-hidden ${
        isSelected ? 'border-teal-600 ring-2 ring-teal-200' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-5">
        {/* Top Header: Verification + Distance */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {hospital.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                {t('verified_badge')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {t('sample_data_badge')}
              </span>
            )}
            <FreshnessBadge
              verifiedAt={hospital.verified_at}
              updatedAt={hospital.updated_at}
              showWarningIfStale={false}
            />
          </div>

          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shrink-0">
            {formatDistance(distanceKm)}
          </span>
        </div>

        {/* Title & Address */}
        <h3
          onClick={onSelect}
          className="text-base font-bold text-slate-900 hover:text-teal-700 transition cursor-pointer"
        >
          {displayName}
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{displayAddress}</span>
        </p>

        {/* Crowd & Intelligent Metrics Grid */}
        <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
          {/* Concept B: Current Waiting Crowd */}
          <div>
            <span className="text-[11px] font-semibold text-slate-600 block mb-1">
              {t('crowd_status')}
            </span>
            <CrowdBadge
              level={crowdMetrics.crowd_level}
              waitingCount={crowdMetrics.waiting_count}
              source={crowdMetrics.source}
              showDetails={false}
            />
          </div>

          {/* Concept D: Estimated Waiting Time */}
          <div>
            <span className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
              <Timer className="w-3 h-3 text-teal-600" />
              {t('estimated_wait_time')}
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {crowdMetrics.estimated_wait_time_min} - {crowdMetrics.estimated_wait_time_max} {t('mins')}
            </span>
            <span className="text-[10px] text-slate-500 block">
              ({hospital.active_counters} {t('active_counters').toLowerCase()})
            </span>
          </div>

          {/* Concept A: Expected Future Load */}
          <div className="col-span-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              {t('expected_patient_load')}:
            </span>
            <span className="font-semibold text-slate-800">
              {crowdMetrics.expected_patient_load} bookings scheduled
            </span>
          </div>
        </div>

        {/* Doctor Availability Bar */}
        <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-3 bg-teal-50/50 rounded-lg border border-teal-100">
          <span className="text-teal-900 font-medium flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            {t('doctors_available')}:
          </span>
          <span className="font-bold text-teal-800">
            {availableDoctors.length} / {hospitalDoctors.length} On Duty
          </span>
        </div>

        {/* Specialties Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hospital.specialties.slice(0, 4).map((spec) => (
            <span
              key={spec}
              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
            >
              {spec}
            </span>
          ))}
          {hospital.specialties.length > 4 && (
            <span className="text-[10px] text-slate-400 px-1 py-0.5 font-medium">
              +{hospital.specialties.length - 4} more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={onSelect}
            className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center gap-1"
          >
            {t('view_details')}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={onBookAppointment}
            className="flex-1 py-2 px-3 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition shadow-2xs flex items-center justify-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            {t('book_appointment')}
          </button>
        </div>
      </div>
    </div>
  );
};
