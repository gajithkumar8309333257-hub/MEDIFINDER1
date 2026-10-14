import React, { useState, useEffect, useCallback } from 'react';
import { LanguageProvider } from './i18n';
import { Navbar, NavTab } from './components/Navbar';
import { DiscoveryView } from './views/DiscoveryView';
import { AppointmentsView } from './views/AppointmentsView';
import { StaffDashboardView } from './views/StaffDashboardView';
import {
  getHospitals,
  getDoctors,
  getAppointments,
  subscribeToRealtimeUpdates,
  resetDemoData,
} from './lib/storage';
import { Hospital, Doctor, Appointment, UserCoordinates } from './types';
import { ShieldCheck, Info, RefreshCw } from 'lucide-react';

export const MediFinderApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('discovery');

  // Core Data State
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // User location (defaults to Central Hyderabad, but updates on GPS permission)
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>({
    latitude: 17.4156,
    longitude: 78.4124, // Jubilee Hills, Hyderabad
  });

  // User session appointments
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);

  // Refresh authoritative state
  const refreshData = useCallback(() => {
    setHospitals(getHospitals());
    setDoctors(getDoctors());
    const all = getAppointments();
    setAppointments(all);

    // Keep user appointments updated with current statuses
    setUserAppointments((prev) => {
      const ids = new Set(prev.map((a) => a.id));
      return all.filter((a) => ids.has(a.id));
    });
  }, []);

  // Initial load and Realtime listener
  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  const handleNewBooking = (appointment: Appointment) => {
    setUserAppointments((prev) => [appointment, ...prev]);
    refreshData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Banner: Verification & Source Notice */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 text-center border-b border-slate-800 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span>
          <strong>MediFinder Live Queue:</strong> Crowd estimates computed from real-time clinic check-ins and verified appointments. For life-threatening emergencies, call <strong>108</strong> immediately.
        </span>
      </div>

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeAppointmentsCount={userAppointments.filter((a) => a.status === 'confirmed' || a.status === 'checked_in').length}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'discovery' && (
          <DiscoveryView
            hospitals={hospitals}
            doctors={doctors}
            appointments={appointments}
            userLocation={userLocation}
            onLocationUpdate={(coords) => setUserLocation(coords)}
            onNewBooking={handleNewBooking}
          />
        )}

        {currentTab === 'appointments' && (
          <AppointmentsView
            userAppointments={userAppointments}
            hospitals={hospitals}
            doctors={doctors}
            allAppointments={appointments}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'staff' && (
          <StaffDashboardView
            hospitals={hospitals}
            doctors={doctors}
            appointments={appointments}
            onRefresh={refreshData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-slate-700">
              MediFinder — Intelligent Hospital Discovery & Appointment Platform
            </p>
            <p className="text-[11px] text-slate-400">
              Multi-channel Queue Model (M/M/c) • Rolling Service-Duration Tracking • Bilingual English & Telugu
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Reset all sample queues and bookings to initial baseline?')) {
                  resetDemoData();
                  refreshData();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
              Reset Demo Data
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-400">
              © 2026 MediFinder. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MediFinderApp />
    </LanguageProvider>
  );
}
