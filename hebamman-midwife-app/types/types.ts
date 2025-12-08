export const COLORS = {
  bg: "#F6F8F7",
  text: "#1D1D1F",
  dim: "#5C6B63",
};

// User roles
export type UserRole = "midwife" | "superuser";

// ---- Data model (extend later to match your API) ----
export type ServiceCode = "B1" | "B2" | "C1" | "C2" | "D1" | "D2" | "E1" | "F1";

export type Appointment = {
  id: string;
  serviceCode: ServiceCode;
  title: string;
  patientName: string;
  patientShort: string; // short display
  serviceType?: "In persona" | "Video" | "Phone";
  startISO: string; // ISO string
  endISO: string;   // ISO string
  durationMin: number;
  expectedTerm?: string; // ISO
  description?: string;
};

// ---- Colors per service code (matches your screenshots closely) ----
export const codeColor = (code: ServiceCode) => {
  switch (code) {
    case "B1": return "#8B5CF6"; // violet
    case "B2": return "#EC4899"; // pink
    case "C1": return "#EF4444"; // red
    case "C2": return "#F59E0B"; // orange
    case "D1": return "#B45309"; // amber/brown
    case "D2": return "#D97706"; // amber
    case "E1": return "#3B82F6"; // blue
    case "F1": return "#7C3AED"; // purple
    default: return "#4B5563";
  }
};

// ---- Helpers ----
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const formatDateTimeRange = (a: Appointment) =>
  `${formatTime(a.startISO)}–${formatTime(a.endISO)}`;

export function groupByDay(items: Appointment[]) {
  const map = new Map<string, Appointment[]>();
  items.forEach((a) => {
    const key = new Date(a.startISO).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "2-digit" });
    map.set(key, [...(map.get(key) ?? []), a]);
  });

  // sort days ASC by date
  const sorted = [...map.entries()].sort((a, b) => {
    const d1 = new Date(a[1][0].startISO);
    const d2 = new Date(b[1][0].startISO);
    return +d1 - +d2;
  });

  // sort within each day by start time
  return sorted.map(([title, data]) => ({
    title,
    data: data.sort((x, y) => +new Date(x.startISO) - +new Date(y.startISO)),
  }));
}

// ---- Midwife data type for admin selection ----
export type MidwifeListItem = {
  _id: string;
  userId: string;
  personalInfo?: {
    profileImage?: {
      url?: string;
    };
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  midwifeStatus?: boolean;
  isProfileComplete?: boolean;
  createdAt?: string;
};

// ---- Mock data (replace with API later) ----
export const mockAppointments: Appointment[] = [
  {
    id: "1",
    serviceCode: "B2",
    title: "Schwangerschaft v",
    patientName: "Patient 2",
    patientShort: "Patient 2",
    serviceType: "Video",
    startISO: "2025-10-02T11:00:00.000Z",
    endISO: "2025-10-02T11:45:00.000Z",
    durationMin: 45,
    description: "Pre-birth Video Consultation",
  },
  {
    id: "2",
    serviceCode: "B1",
    title: "Schwangerschaft p",
    patientName: "Patient 1",
    patientShort: "Patient 1",
    serviceType: "In persona",
    startISO: "2025-10-20T10:00:00.000Z",
    endISO: "2025-10-20T11:00:00.000Z",
    durationMin: 60,
    expectedTerm: "2026-04-16T00:00:00.000Z",
    description: "Pre-birth Consultation (in persona)",
  },
  {
    id: "3",
    serviceCode: "E1",
    title: "Birth Training Class",
    patientName: "Patient 2",
    patientShort: "Patient 2",
    startISO: "2025-10-29T18:00:00.000Z",
    endISO: "2025-10-29T20:20:00.000Z",
    durationMin: 140,
  },
  {
    id: "4",
    serviceCode: "E1",
    title: "Birth Training Class",
    patientName: "Patient 1",
    patientShort: "Patient 1",
    startISO: "2025-10-29T18:00:00.000Z",
    endISO: "2025-10-29T20:20:00.000Z",
    durationMin: 140,
  },
  {
    id: "5",
    serviceCode: "B1",
    title: "Schwangerschaft p",
    patientName: "Patient 1",
    patientShort: "Patient 1",
    startISO: "2025-10-20T08:00:00.000Z",
    endISO: "2025-10-20T09:00:00.000Z",
    durationMin: 60,
    description: "Another pre-birth in-person visit",
  },
];