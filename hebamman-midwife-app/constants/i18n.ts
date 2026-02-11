/**
 * German Translations for Hebamman Midwife App
 * All UI strings in German language
 */

export const de = {
  // App Name & Branding
  appName: 'Praxisverwaltung',
  appTagline: 'geschaffen für freiberufliche Hebammen',

  // Navigation
  nav: {
    overview: 'Übersicht',
    patients: 'Patientinnen',
    appointments: 'Termine',
    requests: 'Anfragen',
    courses: 'Kurse',
    documents: 'Dokumente',
    billing: 'Abrechnung',
    profile: 'Profil',
    toWebsite: 'Zur Webseite',
    logout: 'Abmelden',
  },

  // Common Actions
  actions: {
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    approve: 'Genehmigen',
    reject: 'Ablehnen',
    save: 'Speichern',
    search: 'Suchen',
    filter: 'Filtern',
    refresh: 'Aktualisieren',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    submit: 'Absenden',
    create: 'Erstellen',
    update: 'Aktualisieren',
    viewDetails: 'Details ansehen',
    more: 'Mehr',
  },

  // Common Words
  common: {
    yes: 'Ja',
    no: 'Nein',
    all: 'Alle',
    none: 'Keine',
    today: 'Heute',
    yesterday: 'Gestern',
    tomorrow: 'Morgen',
    week: 'Woche',
    weeks: 'Wochen',
    month: 'Monat',
    months: 'Monate',
    year: 'Jahr',
    date: 'Datum',
    time: 'Uhrzeit',
    status: 'Status',
    name: 'Name',
    email: 'E-Mail',
    phone: 'Telefon',
    address: 'Adresse',
    notes: 'Notizen',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolgreich',
    total: 'Insgesamt',
  },

  // Dashboard
  dashboard: {
    greeting: 'Guten Tag',
    notifications: 'Benachrichtigungen',
    stats: {
      activePatients: 'Aktive Patientinnen',
      openRequests: 'Offene Anfragen',
      birthsThisMonth: 'Geburten diesen Monat',
      appointmentsToday: 'Termine heute',
    },
    todaysAppointments: 'Heutige Termine',
    quickActions: 'Schnellaktionen',
    quickActionButtons: {
      createAppointment: 'Termin erstellen',
      addPatient: 'Patientin anlegen',
      checkRequests: 'Anfragen prüfen',
    },
    noAppointments: 'Keine Termine heute',
    viewAll: 'Alle anzeigen',
    adminBanner: 'Sie verwalten die Praxis von',
    switchBack: 'Zurück wechseln',
  },

  // Patients
  patients: {
    title: 'Patientinnen',
    totalCount: 'Patientinnen insgesamt',
    addNew: 'Neue Patientin',
    searchPlaceholder: 'Nach Name oder E-Mail suchen',
    allStatus: 'Alle Status',
    categories: {
      pregnant: 'Schwanger',
      postpartum: 'Wochenbett',
      completed: 'Abgeschlossen',
    },
    status: {
      schwanger: 'Schwanger',
      wochenbett: 'Wochenbett',
      abgeschlossen: 'Abgeschlossen',
      pending: 'Ausstehend',
      converted: 'Konvertiert',
      cancelled: 'Abgesagt',
    },
    dueDate: 'ET',
    ssw: 'SSW',
    nextAppointment: 'Nächster Termin',
    noPatients: 'Keine Patientinnen gefunden',
  },

  // Appointments
  appointments: {
    title: 'Termine',
    listView: 'Liste',
    calendarView: 'Kalender',
    upcoming: 'Bevorstehend',
    past: 'Vergangen',
    filter: {
      all: 'Alle',
      active: 'Aktiv',
      pending: 'Ausstehend',
      cancelled: 'Abgesagt',
    },
    status: {
      active: 'Aktiv',
      pending: 'Ausstehend',
      cancelled: 'Abgesagt',
      scheduled: 'Geplant',
      completed: 'Abgeschlossen',
    },
    types: {
      checkup: 'Vorsorge',
      homeVisit: 'Hausbesuch',
      videoCall: 'Videocall',
      phoneCall: 'Telefon',
      postpartumCare: 'Wochenbettbetreuung',
      consultation: 'Beratung',
    },
    locations: {
      praxis: 'Praxis',
      hausbesuch: 'Hausbesuch',
      videocall: 'Videocall',
      telefon: 'Telefon',
    },
    serviceCode: 'Leistung',
    duration: 'Dauer',
    minutes: 'Min.',
    patientName: 'Patientin',
    dateTime: 'Datum & Uhrzeit',
    location: 'Ort',
    noAppointments: 'Keine Termine',
    createNew: 'Neuer Termin',
    editAppointment: 'Termin bearbeiten',
    cancelAppointment: 'Termin absagen',
    reactivateAppointment: 'Termin reaktivieren',
    appointmentDetails: 'Termindetails',
    confirmCancel: 'Möchten Sie diesen Termin wirklich absagen?',
    confirmReactivate: 'Möchten Sie diesen Termin reaktivieren?',
    bulkCancel: 'Mehrere Termine absagen',
    selectAppointments: 'Termine auswählen',
    cancelSelected: 'Ausgewählte absagen',
  },

  // Requests
  requests: {
    title: 'Anfragen',
    totalCount: 'Anfragen insgesamt',
    openRequests: 'Offene Anfragen',
    types: {
      reschedule: 'Terminänderung',
      cancellation: 'Stornierung',
      edit: 'Bearbeitung',
      cancelled: 'Abgesagt',
    },
    status: {
      pending: 'Ausstehend',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt',
    },
    requestedBy: 'Angefordert von',
    requestDate: 'Anfragedatum',
    requestedChange: 'Gewünschte Änderung',
    originalAppointment: 'Ursprünglicher Termin',
    newAppointment: 'Neuer Termin',
    reason: 'Grund',
    approveRequest: 'Anfrage genehmigen',
    rejectRequest: 'Anfrage ablehnen',
    confirmApprove: 'Möchten Sie diese Anfrage genehmigen?',
    confirmReject: 'Möchten Sie diese Anfrage ablehnen?',
    noRequests: 'Keine Anfragen',
    viewDetails: 'Details ansehen',
  },

  // Authentication
  auth: {
    login: 'Anmelden',
    logout: 'Abmelden',
    email: 'E-Mail',
    password: 'Passwort',
    forgotPassword: 'Passwort vergessen?',
    resetPassword: 'Passwort zurücksetzen',
    loginFailed: 'Login fehlgeschlagen',
    invalidCredentials: 'Ungültige Anmeldedaten',
    loggedInAs: 'Angemeldet als',
    pleaseWait: 'Bitte warten...',
    signingIn: 'Wird angemeldet...',
  },

  // Profile
  profile: {
    title: 'Profil',
    personalInfo: 'Persönliche Informationen',
    contactInfo: 'Kontaktinformationen',
    services: 'Leistungen',
    testimonials: 'Bewertungen',
    faqs: 'Häufig gestellte Fragen',
    about: 'Über mich',
    slogan: 'Motto',
    firstName: 'Vorname',
    lastName: 'Nachname',
    midwifeTitle: 'Titel',
    serviceRadius: 'Serviceradius',
    socialLinks: 'Social Media',
  },

  // Admin
  admin: {
    title: 'Admin-Bereich',
    midwifeSelection: 'Hebamme auswählen',
    searchMidwife: 'Hebamme suchen',
    managingPracticeOf: 'Sie verwalten die Praxis von',
    selectMidwife: 'Hebamme auswählen',
    noMidwivesFound: 'Keine Hebammen gefunden',
  },

  // Time & Date
  time: {
    at: 'um',
    oclock: 'Uhr',
    from: 'von',
    to: 'bis',
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
    january: 'Januar',
    february: 'Februar',
    march: 'März',
    april: 'April',
    may: 'Mai',
    june: 'Juni',
    july: 'Juli',
    august: 'August',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'Dezember',
  },

  // Messages
  messages: {
    success: {
      saved: 'Erfolgreich gespeichert',
      deleted: 'Erfolgreich gelöscht',
      updated: 'Erfolgreich aktualisiert',
      created: 'Erfolgreich erstellt',
      approved: 'Erfolgreich genehmigt',
      rejected: 'Erfolgreich abgelehnt',
      cancelled: 'Erfolgreich abgesagt',
    },
    error: {
      generic: 'Ein Fehler ist aufgetreten',
      loadFailed: 'Laden fehlgeschlagen',
      saveFailed: 'Speichern fehlgeschlagen',
      deleteFailed: 'Löschen fehlgeschlagen',
      networkError: 'Netzwerkfehler',
      unauthorized: 'Nicht autorisiert',
      notFound: 'Nicht gefunden',
    },
    confirm: {
      delete: 'Möchten Sie wirklich löschen?',
      cancel: 'Möchten Sie wirklich abbrechen?',
      logout: 'Möchten Sie sich wirklich abmelden?',
    },
  },

  // Service Codes (Leistungen)
  serviceCodes: {
    'A1/A2': 'A1/A2 - Erstberatung',
    'B1': 'B1 - Schwangerenvorsorge',
    'B2': 'B2 - Hilfeleistung bei Beschwerden',
    'C1': 'C1 - Geburtsvorbereitung',
    'C2': 'C2 - Stillberatung',
    'D1': 'D1 - Wochenbettbetreuung',
    'D2': 'D2 - Rückbildung',
    'E1': 'E1 - Akupunktur',
    'F1': 'F1 - Weitere Leistungen',
  },

  // Insurance Types
  insurance: {
    government: 'Gesetzlich',
    private: 'Privat',
  },
};

// Export default for easy import
export default de;

// Type for autocomplete support
export type TranslationKey = typeof de;
