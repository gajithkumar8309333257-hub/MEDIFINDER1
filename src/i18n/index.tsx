import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'te';

export const translations = {
  en: {
    // App header & brand
    app_title: 'MediFinder',
    tagline: 'Intelligent Hospital Discovery & Real-Time Patient Queue Platform',
    home: 'Home',
    nearby_hospitals: 'Nearby Hospitals',
    my_appointments: 'My Appointments',
    staff_dashboard: 'Staff Dashboard',
    change_language: 'Language',
    
    // Discovery & Search
    find_nearby_btn: 'Use My Current Location',
    location_permission_needed: 'Location permission needed to calculate exact hospital distance.',
    location_denied: 'Location access denied or unavailable. You can search by city or locality.',
    search_placeholder: 'Search by hospital name, specialty, or area...',
    all_specialties: 'All Specialties',
    sort_by: 'Sort By',
    sort_distance: 'Nearest First',
    sort_crowd: 'Lowest Crowd',
    sort_availability: 'Doctors Available',
    filter_open_now: 'Open Now Only',
    filter_verified_only: 'Verified Facilities Only',
    hospitals_found: 'Hospitals found',
    no_hospitals_found: 'No hospitals match your criteria.',
    list_view: 'List View',
    map_view: 'Interactive Map',
    
    // Hospital Card & Details
    verified_badge: 'Verified Facility',
    sample_data_badge: 'Demonstration / Sample Data',
    view_details: 'View Profile & Doctors',
    book_appointment: 'Book Appointment',
    operating_hours: 'Hours',
    emergency_contact: 'Emergency',
    contact_phone: 'Reception',
    active_counters: 'Active Counters',
    doctors_available: 'Doctors On Duty',
    specialties: 'Specialties',
    
    // Crowd & Queue
    crowd_status: 'Crowd Status',
    crowd_low: 'Low Crowd',
    crowd_moderate: 'Moderate Crowd',
    crowd_high: 'High Crowd',
    crowd_unknown: 'Waiting Info Unavailable',
    waiting_patients: 'Patients Currently Waiting',
    in_service_now: 'Patients in Consultation',
    expected_patient_load: 'Expected Patient Load',
    estimated_wait_time: 'Estimated Waiting Time',
    mins: 'mins',
    source_label: 'Source',
    source_queue: 'Direct Clinic Check-In Records',
    source_appointments: 'Confirmed Booking Schedule',
    source_staff: 'Hospital Staff Manual Update',
    source_demo: 'Simulated Demonstration Model',
    data_freshness: 'Freshness',
    freshness_recent: 'Verified Recently (<15m)',
    freshness_aging: 'Aging Data (15-60m)',
    freshness_stale: 'Stale Information (>60m)',
    freshness_unknown: 'Verification Pending',
    stale_warning: 'Crowd status may be outdated. Call the hospital to confirm before visiting.',
    
    // Booking Engine
    schedule_appointment: 'Schedule an Appointment',
    select_doctor: '1. Select Doctor',
    select_date: '2. Select Date',
    select_slot: '3. Select Time Slot',
    patient_details: '4. Patient Information',
    full_name: 'Full Name',
    phone_number: '10-Digit Mobile Number',
    age: 'Age',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    confirm_booking: 'Confirm Booking',
    booking_confirmed: 'Appointment Successfully Confirmed!',
    booking_reference_label: 'Your Booking Reference',
    booking_reference_hint: 'Save this code. You will present it at the hospital reception for check-in.',
    slot_full_error: 'Selected time slot is already fully booked. Please choose another slot.',
    duplicate_booking_error: 'You already have an appointment booked for this doctor on this day.',
    close: 'Close',
    back: 'Back',
    cancel_appointment: 'Cancel Appointment',
    cancel_confirm: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
    reschedule: 'Reschedule',
    
    // Patient Appointments View
    my_bookings_title: 'My Appointment Bookings',
    lookup_by_ref: 'Find Booking by Reference Code',
    enter_ref_code: 'Enter Reference (e.g. MF-2026-...)',
    search_ref_btn: 'Lookup',
    no_active_bookings: 'No appointments found. Book an appointment from the Nearby Hospitals list.',
    status: 'Status',
    status_confirmed: 'Confirmed (Awaiting Arrival)',
    status_checked_in: 'Checked In (Waiting in Queue)',
    status_called: 'Called (Proceed to Room)',
    status_in_service: 'In Consultation',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled',
    status_no_show: 'No Show',
    queue_position: 'Queue Position',
    ahead_of_you: 'patients ahead of you',
    
    // Staff Dashboard
    staff_portal: 'Hospital Staff Operations Portal',
    select_hospital: 'Select Managing Hospital',
    live_queue_management: 'Live Queue & Patient Check-In',
    registered_patients_today: "Today's Patient Queue",
    action_check_in: 'Register Arrival',
    action_call: 'Call Next',
    action_start_service: 'Start Consultation',
    action_complete: 'Complete Consultation',
    action_no_show: 'Mark No-Show',
    action_cancel: 'Cancel',
    queue_empty: 'No patients waiting in queue.',
    quick_crowd_override: 'Staff Crowd Status Override',
    update_crowd_btn: 'Update Crowd Level',
    crowd_updated_success: 'Crowd status updated and timestamped successfully.',
    audit_trail: 'Audit Log & Activity History',
    doctor_duty_management: 'Doctor Roster & Availability',
    toggle_availability: 'Toggle Duty Status',
    available: 'On Duty',
    on_leave: 'Off Duty / On Leave',
    
    // General
    loading: 'Loading information...',
    error_occurred: 'An error occurred. Please try again.',
    save: 'Save',
    dismiss: 'Dismiss',
  },
  te: {
    // App header & brand
    app_title: 'మెడిఫైండర్ (MediFinder)',
    tagline: 'సమీప ఆసుపత్రుల గుర్తింపు మరియు ప్రత్యక్ష రోగుల క్యూ వేదిక',
    home: 'హోమ్',
    nearby_hospitals: 'సమీప ఆసుపత్రులు',
    my_appointments: 'నా అపాయింట్‌మెంట్లు',
    staff_dashboard: 'సిబ్బంది డ్యాష్‌బోర్డ్',
    change_language: 'భాష',
    
    // Discovery & Search
    find_nearby_btn: 'నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి',
    location_permission_needed: 'సమీప ఆసుపత్రుల దూరం లెక్కించడానికి లొకేషన్ అనుమతి అవసరం.',
    location_denied: 'లొకేషన్ అనుమతి నిరాకరించబడింది. మీరు నగరం లేదా ప్రాంతం ద్వారా శోధించవచ్చు.',
    search_placeholder: 'ఆసుపత్రి పేరు, స్పెషాలిటీ లేదా ప్రాంతం ద్వారా వెతకండి...',
    all_specialties: 'అన్ని విభాగాలు',
    sort_by: 'క్రమబద్ధీకరించు',
    sort_distance: 'దగ్గరగా ఉన్నవి',
    sort_crowd: 'తక్కువ రద్దీ ఉన్నవి',
    sort_availability: 'వైద్యులు అందుబాటులో ఉన్నవి',
    filter_open_now: 'ప్రస్తుతం తెరిచి ఉన్నవి మాత్రమే',
    filter_verified_only: 'ధృవీకరించబడినవి మాత్రమే',
    hospitals_found: 'ఆసుపత్రులు కనుగొనబడ్డాయి',
    no_hospitals_found: 'మీ శోధనకు సరిపోలే ఆసుపత్రులు ఏవీ లేవు.',
    list_view: 'జాబితా దృశ్యం',
    map_view: 'మ్యాప్ దృశ్యం',
    
    // Hospital Card & Details
    verified_badge: 'ధృవీకరించబడిన ఆసుపత్రి',
    sample_data_badge: 'ప్రదర్శన / నమూనా డేటా',
    view_details: 'వివరాలు & వైద్యులు',
    book_appointment: 'అపాయింట్‌మెంట్ బుక్ చేయండి',
    operating_hours: 'సమయాలు',
    emergency_contact: 'అత్యవసర విభాగం',
    contact_phone: 'రిసెప్షన్ ఫోన్',
    active_counters: 'క్రియాశీల కౌంటర్లు',
    doctors_available: 'విధుల్లో ఉన్న వైద్యులు',
    specialties: 'చికిత్సా విభాగాలు',
    
    // Crowd & Queue
    crowd_status: 'రద్దీ స్థితి',
    crowd_low: 'తక్కువ రద్దీ',
    crowd_moderate: 'మితమైన రద్దీ',
    crowd_high: 'ఎక్కువ రద్దీ',
    crowd_unknown: 'రద్దీ సమాచారం అందుబాటులో లేదు',
    waiting_patients: 'ప్రస్తుతం వేచి ఉన్న రోగులు',
    in_service_now: 'వైద్యుని వద్ద ఉన్న రోగులు',
    expected_patient_load: 'రాబోయే అంచనా రోగుల సంఖ్య',
    estimated_wait_time: 'అంచనా వేచి ఉండే సమయం',
    mins: 'నిమిషాలు',
    source_label: 'సమాచార మూలం',
    source_queue: 'ఆసుపత్రి ప్రత్యక్ష చెక్-ఇన్ రికార్డులు',
    source_appointments: 'ధృవీకరించబడిన బుకింగ్స్ షెడ్యూల్',
    source_staff: 'సిబ్బంది మాన్యువల్ అప్‌డేట్',
    source_demo: 'సిమ్యులేటెడ్ ప్రదర్శన నమూనా',
    data_freshness: 'డేటా తాజాదనం',
    freshness_recent: 'ఇటీవల ధృవీకరించబడింది (<15 నిమిషాలు)',
    freshness_aging: 'కొద్ది సమయం క్రితం (15-60 నిమిషాలు)',
    freshness_stale: 'పాత సమాచారం (>60 నిమిషాలు)',
    freshness_unknown: 'ధృవీకరణ పెండింగ్‌లో ఉంది',
    stale_warning: 'ఈ రద్దీ సమాచారం పాతది కావచ్చు. వెళ్లే ముందు ఆసుపత్రిని సంప్రదించండి.',
    
    // Booking Engine
    schedule_appointment: 'అపాయింట్‌మెంట్ షెడ్యూల్ చేయండి',
    select_doctor: '1. వైద్యుడిని ఎంచుకోండి',
    select_date: '2. తేదీని ఎంచుకోండి',
    select_slot: '3. సమయాన్ని ఎంచుకోండి',
    patient_details: '4. రోగి వివరాలు',
    full_name: 'పూర్తి పేరు',
    phone_number: '10 అంకెల మొబైల్ సంఖ్య',
    age: 'వయస్సు',
    gender: 'లింగం',
    male: 'పురుషుడు',
    female: 'స్త్రీ',
    other: 'ఇతర',
    confirm_booking: 'బుకింగ్ నిర్ధారించండి',
    booking_confirmed: 'అపాయింట్‌మెంట్ విజయవంతంగా ఖరారైంది!',
    booking_reference_label: 'మీ బుకింగ్ రిఫరెన్స్ కోడ్',
    booking_reference_hint: 'ఈ కోడ్‌ను భద్రపరుచుకోండి. ఆసుపత్రి రిసెప్షన్‌లో చెక్-ఇన్ కోసం దీన్ని చూపించాలి.',
    slot_full_error: 'ఎంచుకున్న సమయం ఇప్పటికే పూర్తిగా నిండిపోయింది. దయచేసి వేరే సమయాన్ని ఎంచుకోండి.',
    duplicate_booking_error: 'మీకు ఈ రోజు ఈ వైద్యుడితో ఇప్పటికే అపాయింట్‌మెంట్ ఉంది.',
    close: 'మూసివేయి',
    back: 'వెనుకకు',
    cancel_appointment: 'రద్దు చేయండి',
    cancel_confirm: 'మీరు నిజంగా ఈ అపాయింట్‌మెంట్‌ను రద్దు చేయాలనుకుంటున్నారా? ఈ చర్యను వెనక్కి తీసుకోలేరు.',
    reschedule: 'మరో సమయానికి మార్చండి',
    
    // Patient Appointments View
    my_bookings_title: 'నా అపాయింట్‌మెంట్లు',
    lookup_by_ref: 'రిఫరెన్స్ కోడ్ ద్వారా వెతకండి',
    enter_ref_code: 'రిఫరెన్స్ కోడ్ నమోదు చేయండి (ఉదా: MF-2026-...)',
    search_ref_btn: 'శోధించండి',
    no_active_bookings: 'అపాయింట్‌మెంట్లు ఏవీ లేవు. సమీప ఆసుపత్రుల జాబితా నుండి బుక్ చేసుకోండి.',
    status: 'స్థితి',
    status_confirmed: 'ఖరారైంది (రాక కోసం వేచి ఉంది)',
    status_checked_in: 'చెక్-ఇన్ పూర్తయింది (క్యూలో వేచి ఉన్నారు)',
    status_called: 'పిలిచారు (గదిలోకి వెళ్లండి)',
    status_in_service: 'వైద్యుని సంప్రదింపు జరుగుతోంది',
    status_completed: 'పూర్తయింది',
    status_cancelled: 'రద్దు చేయబడింది',
    status_no_show: 'హాజరు కాలేదు',
    queue_position: 'క్యూలో స్థానం',
    ahead_of_you: 'మంది రోగులు మీ ముందు ఉన్నారు',
    
    // Staff Dashboard
    staff_portal: 'ఆసుపత్రి సిబ్బంది నిర్వహణ పోర్టల్',
    select_hospital: 'నిర్వహించే ఆసుపత్రిని ఎంచుకోండి',
    live_queue_management: 'ప్రత్యక్ష క్యూ మరియు రోగుల చెక్-ఇన్',
    registered_patients_today: 'నేటి రోగుల క్యూ',
    action_check_in: 'రాక నమోదు చేయండి',
    action_call: 'తదుపరి రోగిని పిలవండి',
    action_start_service: 'సంప్రదింపు ప్రారంభించండి',
    action_complete: 'సంప్రదింపు ముగించండి',
    action_no_show: 'హాజరుకాలేదుగా గుర్తించండి',
    action_cancel: 'రద్దు చేయండి',
    queue_empty: 'క్యూలో రోగులు ఎవరూ వేచి లేరు.',
    quick_crowd_override: 'సిబ్బంది రద్దీ స్థితి మార్పు',
    update_crowd_btn: 'రద్దీ స్థితిని నవీకరించండి',
    crowd_updated_success: 'రద్దీ స్థితి విజయవంతంగా నవీకరించబడింది.',
    audit_trail: 'కార్యకలాపాల చరిత్ర (Audit Log)',
    doctor_duty_management: 'వైద్యుల విధులలో లభ్యత',
    toggle_availability: 'లభ్యత మార్చండి',
    available: 'విధుల్లో ఉన్నారు',
    on_leave: 'సెలవులో ఉన్నారు',
    
    // General
    loading: 'సమాచారం లోడ్ అవుతోంది...',
    error_occurred: 'లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    save: 'భద్రపరచు',
    dismiss: 'రద్దు',
  }
};

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: TranslationKey) => translations.en[key] || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('medifinder_lang');
      return (saved === 'te' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('medifinder_lang', lang);
    } catch {
      // ignore localstorage errors
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.en;
    if (langDict[key]) {
      return langDict[key];
    }
    return translations.en[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
