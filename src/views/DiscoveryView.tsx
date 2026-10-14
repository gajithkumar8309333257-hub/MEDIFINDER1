import React, { useState, useMemo } from 'react';
import { Hospital, Doctor, Appointment, UserCoordinates } from '../types';
import { useTranslation } from '../i18n';
import { HospitalCard } from '../components/HospitalCard';
import { HospitalMap } from '../components/HospitalMap';
import { HospitalDetailModal } from '../components/HospitalDetailModal';
import { BookingModal } from '../components/BookingModal';
import { calculateDistanceKm } from '../lib/distance';
import { computeHospitalCrowdMetrics } from '../lib/crowdEngine';
import {
  Search,
  MapPin,
  Filter,
  ArrowUpDown,
  Navigation,
  List,
  Map as MapIcon,
  AlertCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface DiscoveryViewProps {
  hospitals: Hospital[];
  doctors: Doctor[];
  appointments: Appointment[];
  userLocation: UserCoordinates | null;
  onLocationUpdate: (coords: UserCoordinates) => void;
  onNewBooking: (appointment: Appointment) => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({
  hospitals,
  doctors,
  appointments,
  userLocation,
  onLocationUpdate,
  onNewBooking,
}) => {
  const { t, language } = useTranslation();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'crowd' | 'availability'>('distance');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'list' | 'map'>('both');

  // Location Permission State
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Modal State
  const [selectedHospitalForDetail, setSelectedHospitalForDetail] = useState<Hospital | null>(null);
  const [bookingHospital, setBookingHospital] = useState<Hospital | null>(null);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>(undefined);

  // Request GPS Location with user confirmation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onLocationUpdate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(t('location_denied'));
        } else {
          setLocationError('Unable to retrieve location. Please use manual search.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Distinct list of all specialties
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    hospitals.forEach((h) => h.specialties.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [hospitals]);

  // Compute metrics and distances for all hospitals
  const hospitalsWithMetrics = useMemo(() => {
    return hospitals.map((hosp) => {
      const distance = userLocation
        ? calculateDistanceKm(userLocation, { latitude: hosp.latitude, longitude: hosp.longitude })
        : Infinity;

      const metrics = computeHospitalCrowdMetrics(
        hosp.id,
        appointments,
        hosp.active_counters,
        hosp.avg_service_mins,
        'queue_system',
        hosp.verified_at,
        hosp.updated_at
      );

      const hospDoctors = doctors.filter((d) => d.hospital_id === hosp.id);
      const availableDoctorsCount = hospDoctors.filter((d) => d.is_available).length;

      return {
        hospital: hosp,
        distance,
        metrics,
        availableDoctorsCount,
      };
    });
  }, [hospitals, doctors, appointments, userLocation]);

  // Filter and Sort Hospitals
  const filteredHospitals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return hospitalsWithMetrics
      .filter(({ hospital, availableDoctorsCount }) => {
        // Specialty filter
        if (selectedSpecialty !== 'ALL' && !hospital.specialties.includes(selectedSpecialty)) {
          return false;
        }

        // Verified filter
        if (verifiedOnly && !hospital.is_verified) {
          return false;
        }

        // Search query
        if (q) {
          const nameEn = hospital.name.toLowerCase();
          const nameTe = (hospital.name_te || '').toLowerCase();
          const area = hospital.area.toLowerCase();
          const city = hospital.city.toLowerCase();
          const matchesSpec = hospital.specialties.some((s) => s.toLowerCase().includes(q));

          if (!nameEn.includes(q) && !nameTe.includes(q) && !area.includes(q) && !city.includes(q) && !matchesSpec) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return a.distance - b.distance;
        }
        if (sortBy === 'crowd') {
          // low (1) < moderate (2) < high (3)
          const weight = { low: 1, moderate: 2, high: 3, unknown: 4 };
          return weight[a.metrics.crowd_level] - weight[b.metrics.crowd_level];
        }
        if (sortBy === 'availability') {
          return b.availableDoctorsCount - a.availableDoctorsCount;
        }
        return 0;
      });
  }, [hospitalsWithMetrics, searchQuery, selectedSpecialty, verifiedOnly, sortBy]);

  const crowdLevelMap = useMemo(() => {
    const map: Record<string, any> = {};
    hospitalsWithMetrics.forEach(({ hospital, metrics }) => {
      map[hospital.id] = metrics.crowd_level;
    });
    return map;
  }, [hospitalsWithMetrics]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Search & Location Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-navy-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-teal-100 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            Verified Hyderabad & Telangana Hospital Directory
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Find Nearby Hospitals with <span className="text-teal-300">Live Patient Queue Times</span>
          </h1>

          <p className="text-sm text-teal-100/90 leading-relaxed">
            Avoid unnecessary clinic delays. MediFinder continuously calculates expected booking loads,
            waiting queue times, and on-duty doctor availability before you step out of home.
          </p>

          {/* Location Trigger & Status */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="px-4 py-2.5 bg-white text-teal-800 font-bold text-xs rounded-xl shadow-md hover:bg-teal-50 transition flex items-center gap-2"
            >
              <Navigation className={`w-4 h-4 text-teal-600 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? t('loading') : t('find_nearby_btn')}</span>
            </button>

            {userLocation ? (
              <span className="text-xs text-teal-200 flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-xl">
                <Check className="w-4 h-4 text-emerald-400" />
                Location active (Hyderabad area)
              </span>
            ) : (
              <span className="text-xs text-teal-200/80">
                {t('location_permission_needed')}
              </span>
            )}
          </div>

          {locationError && (
            <div className="p-3 bg-rose-900/60 border border-rose-400/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Specialty Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">{t('all_specialties')}</option>
              {allSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="distance">{t('sort_distance')}</option>
              <option value="crowd">{t('sort_crowd')}</option>
              <option value="availability">{t('sort_availability')}</option>
            </select>
          </div>

          {/* View Mode Switcher (List vs Map) */}
          <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50 shrink-0">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'both' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'list' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {t('list_view')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'map' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              {t('map_view')}
            </button>
          </div>
        </div>

        {/* Filter Checkbox */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            <span>{t('filter_verified_only')}</span>
          </label>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            {filteredHospitals.length} {t('hospitals_found')}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Hospital List Column */}
        {(viewMode === 'both' || viewMode === 'list') && (
          <div className={viewMode === 'both' ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
            {filteredHospitals.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">{t('no_hospitals_found')}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search keywords, clearing specialty filters, or enabling GPS location.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('ALL');
                    setVerifiedOnly(false);
                  }}
                  className="px-4 py-2 bg-teal-50 text-teal-700 rounded-xl text-xs font-semibold hover:bg-teal-100 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredHospitals.map(({ hospital, distance, metrics }) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  distanceKm={distance}
                  crowdMetrics={metrics}
                  doctors={doctors}
                  onSelect={() => setSelectedHospitalForDetail(hospital)}
                  onBookAppointment={() => setBookingHospital(hospital)}
                  isSelected={selectedHospitalForDetail?.id === hospital.id}
                />
              ))
            )}
          </div>
        )}

        {/* Map Column */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <div className={viewMode === 'both' ? 'lg:col-span-5 sticky top-20' : 'lg:col-span-12'}>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  Interactive Hospital & Queue Map
                </span>
                <span className="text-[11px] text-slate-500">
                  Click markers to view wait times
                </span>
              </div>

              <HospitalMap
                hospitals={filteredHospitals.map((item) => item.hospital)}
                userLocation={userLocation}
                selectedHospitalId={selectedHospitalForDetail?.id}
                onSelectHospital={(hosp) => setSelectedHospitalForDetail(hosp)}
                hospitalCrowdLevels={crowdLevelMap}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hospital Detail Modal */}
      {selectedHospitalForDetail && (
        <HospitalDetailModal
          hospital={selectedHospitalForDetail}
          doctors={doctors}
          crowdMetrics={
            hospitalsWithMetrics.find((h) => h.hospital.id === selectedHospitalForDetail.id)?.metrics ||
            computeHospitalCrowdMetrics(selectedHospitalForDetail.id, appointments)
          }
          distanceKm={
            userLocation
              ? calculateDistanceKm(userLocation, {
                  latitude: selectedHospitalForDetail.latitude,
                  longitude: selectedHospitalForDetail.longitude,
                })
              : Infinity
          }
          onClose={() => setSelectedHospitalForDetail(null)}
          onBookAppointment={(doctorId) => {
            setPreselectedDoctorId(doctorId);
            setBookingHospital(selectedHospitalForDetail);
            setSelectedHospitalForDetail(null);
          }}
        />
      )}

      {/* Booking Modal */}
      {bookingHospital && (
        <BookingModal
          hospital={bookingHospital}
          doctors={doctors}
          preselectedDoctorId={preselectedDoctorId}
          onClose={() => {
            setBookingHospital(null);
            setPreselectedDoctorId(undefined);
          }}
          onBookingSuccess={(apt) => {
            onNewBooking(apt);
          }}
        />
      )}
    </div>
  );
};
