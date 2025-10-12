import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---- Leads hook & helpers ----
import { Lead, leadAddress, leadDisplayDate, useLeads } from "@/hooks/useLeads";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { api } from "@/lib/api";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  badgePending: "#EAB308",
  badgeDone: "#22C55E",
  badgeGray: "#9CA3AF",
  line: "#E5E7EB",
};

// Service colors
const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": "#7c3aed",
  B1: "#2563eb",
  B2: "#0ea5e9",
  E1: "#f59e0b",
  C1: "#16a34a",
  C2: "#10b981",
  D1: "#ef4444",
  D2: "#f97316",
  F1: "#a855f7",
};

const SERVICE_NAMES: Record<string, string> = {
  "A1/A2": "Initial Consultation",
  B1: "Pre Birth Visit",
  B2: "Pre Birth Video",
  E1: "Birth Training",
  C1: "Early Care Visit",
  C2: "Early Care Video",
  D1: "Late Care Visit",
  D2: "Late Care Video",
  F1: "After Birth Gym",
};

const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.sage;

// Types
type Patient = {
  _id: string;
  userId: string;
  midwifeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: "pending" | "converted" | "cancelled";
};

type MonthKey = string;

type Apt = {
  midwifeId: string;
  clientId?: string;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  serviceCode: string;
};

type MonthlyBucket = {
  ["A1/A2"]?: Apt[];
  B1?: Apt[];
  B2?: Apt[];
  E1?: Apt[];
  C1?: Apt[];
  C2?: Apt[];
  D1?: Apt[];
  D2?: Apt[];
  F1?: Apt[];
};

type MonthlySuccess = {
  success: true;
  message?: string;
  data: Record<MonthKey, MonthlyBucket>;
  meta?: { monthsFound?: number; totalDocuments?: number };
};

type UiApt = Apt & { serviceCode: string; dateObj: Date; clientName?: string };

type UserDetail = {
  name: string;
  email: string;
  role: string;
};

// Helpers
const toDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((n) => parseInt(n, 10));
  return new Date(yyyy, mm - 1, dd);
};

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function fetchMonthlyOnce(
  url: string,
  payload: { midwifeId: string; clientET: string }
): Promise<MonthlySuccess | null> {
  try {
    const res = await api(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await readJsonSafe<MonthlySuccess | { success: false; message: string }>(res);
    if (!json || (json as any).success !== true) return null;
    const ok = json as MonthlySuccess;
    if (!ok.data || Object.keys(ok.data).length === 0) return null;
    return ok;
  } catch {
    return null;
  }
}

async function fetchUserDetails(ids: string[]): Promise<Record<string, UserDetail>> {
  try {
    const res = await api("/api/public/user/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await readJsonSafe<{ success: boolean; data: Record<string, UserDetail> }>(res);
    if (json?.success && json.data) {
      return json.data;
    }
    return {};
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {};
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Get profile by userId
  const { data: profile, status: pStatus } = useMidwifeProfile(user?.id);
  const midwifeId = profile?._id;

  // Fetch leads
  const { upcoming, loading: leadsLoading } = useLeads(midwifeId);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const upcomingLeads5 = React.useMemo(() => upcoming.slice(0, 5), [upcoming]);

  // Fetch patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!midwifeId) return;
    
    setLoadingPatients(true);
    try {
      const res = await api(`/api/public/midwifeBooking/${midwifeId}`);
      const json = await res.json();
      
      if (json.success) {
        setPatients(json.data || []);
      }
    } catch (e: any) {
      console.error("Error fetching patients:", e);
    } finally {
      setLoadingPatients(false);
    }
  }, [midwifeId]);

  useEffect(() => {
    if (midwifeId) {
      fetchPatients();
    }
  }, [midwifeId, fetchPatients]);

  // Active patients count (converted status)
  const activePatientsCount = useMemo(() => {
    return patients.filter(p => p.status === "converted").length;
  }, [patients]);

  // Latest 5 active patients
  const activePatients5 = useMemo(() => {
    return patients
      .filter(p => p.status === "converted")
      .slice(0, 5);
  }, [patients]);

  // Fetch appointments
  const clientET = useMemo(() => new Date(), []);
  const [appointments, setAppointments] = useState<UiApt[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});

  const fetchAppointments = useCallback(async () => {
    if (!midwifeId) return;
    
    setLoadingAppointments(true);
    try {
      const payload = { midwifeId, clientET: clientET.toISOString() };
      
      let ok =
        (await fetchMonthlyOnce(`/api/public/PostBirthAppointments/monthly-view`, payload)) ||
        (await fetchMonthlyOnce(`/app/api/public/PostBirthAppointments/monthly-view`, payload));
      
      if (!ok) {
        setAppointments([]);
        return;
      }

      // Extract all appointments
      const allApts: UiApt[] = [];
      Object.values(ok.data || {}).forEach((bucket) => {
        const add = (list: Apt[] | undefined, svc: string) => {
          (list ?? []).forEach((a) => 
            allApts.push({ ...a, serviceCode: svc, dateObj: toDate(a.appointmentDate) })
          );
        };
        add(bucket["A1/A2"], "A1/A2");
        add(bucket.B1, "B1");
        add(bucket.B2, "B2");
        add(bucket.E1, "E1");
        add(bucket.C1, "C1");
        add(bucket.C2, "C2");
        add(bucket.D1, "D1");
        add(bucket.D2, "D2");
        add(bucket.F1, "F1");
      });

      // Extract unique client IDs
      const clientIds = new Set<string>();
      allApts.forEach((a) => {
        if (a.clientId) clientIds.add(a.clientId);
      });

      // Fetch user details
      if (clientIds.size > 0) {
        const details = await fetchUserDetails(Array.from(clientIds));
        setUserDetails(details);
        
        // Add client names to appointments
        allApts.forEach(apt => {
          if (apt.clientId && details[apt.clientId]) {
            apt.clientName = details[apt.clientId].name;
          }
        });
      }

      // Sort by date and time
      allApts.sort((a, b) => {
        const d = a.dateObj.getTime() - b.dateObj.getTime();
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });

      setAppointments(allApts);
    } catch (e: any) {
      console.error("Error fetching appointments:", e);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [midwifeId, clientET]);

  useEffect(() => {
    if (midwifeId) {
      fetchAppointments();
    }
  }, [midwifeId, fetchAppointments]);

  // Get upcoming 5 appointments (future dates only)
  const upcomingApp5 = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return appointments
      .filter(apt => apt.dateObj >= now)
      .slice(0, 5);
  }, [appointments]);

  const navigateToPatient = (patient: Patient) => {
    router.push({
      pathname: "/(app)/patients/appointments" as any,
      params: {
        clientId: patient.userId,
        midwifeId: midwifeId,
        patientName: patient.fullName,
      }
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
      {/* Welcome */}
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.h1}>Welcome, {user?.username ?? "Midwife"}</Text>
        <Text style={styles.sub}>Manage your patients & schedule at a glance.</Text>
      </View>

      {/* Stat: Active Patients */}
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Active Patients</Text>
        {loadingPatients ? (
          <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 8 }} />
        ) : (
          <Text style={styles.statValue}>{activePatientsCount}</Text>
        )}
      </View>

      {/* A1/A2 Consultation (Leads) - Unchanged */}
      <SectionHeader
        title="A1/A2 Consultation (Leads)"
        action={
          <Link href={{ pathname: "/(app)/leads" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>See all leads</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {leadsLoading && <Text style={{ color: COLORS.dim }}>Loading…</Text>}
        {!leadsLoading && upcomingLeads5.length === 0 && (
          <Text style={{ color: COLORS.dim }}>No upcoming leads.</Text>
        )}
        {!leadsLoading &&
          upcomingLeads5.map((lead, i) => (
            <Pressable
              key={lead._id}
              onPress={() => setSelectedLead(lead)}
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{lead.fullName}</Text>
                <Text style={styles.rowSub}>{lead.email} · {lead.phoneNumber}</Text>
                <Text style={styles.rowSubSmall}>{leadAddress(lead)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.when}>{leadDisplayDate(lead)}</Text>
                <Text style={styles.slot}>{lead.selectedSlot ?? "—"}</Text>
              </View>
            </Pressable>
          ))}
      </View>

      {/* Upcoming Appointments - Real Data */}
      <SectionHeader
        title="Upcoming Appointments"
        action={
          <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>See all appointments</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {loadingAppointments && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        )}
        {!loadingAppointments && upcomingApp5.length === 0 && (
          <Text style={{ color: COLORS.dim, paddingVertical: 12 }}>No upcoming appointments.</Text>
        )}
        {!loadingAppointments &&
          upcomingApp5.map((a, i) => (
            <View key={`${a.serviceCode}-${a.appointmentId}`} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.dot, { backgroundColor: codeColor(a.serviceCode) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {a.serviceCode} • {SERVICE_NAMES[a.serviceCode] || a.serviceCode}
                </Text>
                <Text style={styles.rowSub}>{a.clientName || "Patient"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.when}>{fmtDateShort(a.dateObj)}</Text>
                <Text style={styles.slot}>{a.startTime}–{a.endTime} · {a.duration}m</Text>
              </View>
            </View>
          ))}
      </View>

      {/* Active Patients (Latest 5) - Replaces Requests */}
      <SectionHeader
        title="Active Patients"
        action={
          <Link href={{ pathname: "/(app)/patients" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>View all patients</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {loadingPatients && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        )}
        {!loadingPatients && activePatients5.length === 0 && (
          <Text style={{ color: COLORS.dim, paddingVertical: 12 }}>No active patients.</Text>
        )}
        {!loadingPatients &&
          activePatients5.map((patient, i) => (
            <TouchableOpacity
              key={patient._id}
              
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{patient.fullName}</Text>
                <Text style={styles.rowSub}>{patient.email}</Text>
                <Text style={styles.rowSubSmall}>{patient.phoneNumber}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Active</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
      </View>

  

      {/* Lead details modal */}
      {selectedLead && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedLead(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelectedLead(null)}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lead Details</Text>
                <TouchableOpacity onPress={() => setSelectedLead(null)}>
                  <Text style={{ fontWeight: "700", color: COLORS.dim }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Detail label="Name" value={selectedLead.fullName} />
              <Detail label="Email" value={selectedLead.email} />
              <Detail label="Phone" value={selectedLead.phoneNumber} />
              <Detail label="Date" value={leadDisplayDate(selectedLead)} />
              <Detail label="Slot" value={selectedLead.selectedSlot ?? "—"} />
              <Detail label="Insurance" value={`${selectedLead.insuranceType ?? "—"} (${selectedLead.insuranceCompany ?? "—"})`} />
              <Detail label="Address" value={leadAddress(selectedLead)} />
              <Detail label="Status" value={selectedLead.status ?? "pending"} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ScrollView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      <Text style={{ width: 110, color: COLORS.dim, fontWeight: "700" }}>{label}:</Text>
      <Text style={{ flex: 1, color: COLORS.text }}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  sub: { color: COLORS.dim, marginTop: 4 },

  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statLabel: { color: COLORS.dim, fontWeight: "600" },
  statValue: { fontSize: 36, fontWeight: "900", color: COLORS.accent, marginTop: 6 },

  sectionHeader: {
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  linkBtnText: { color: "white", fontWeight: "700" },

  linkBtnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginTop: 8,
  },
  linkBtnSecondaryText: { color: COLORS.accent, fontWeight: "700" },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
  },
  rowTitle: { fontWeight: "700", color: COLORS.text },
  rowSub: { color: COLORS.dim, marginTop: 2 },
  rowSubSmall: { color: COLORS.dim, marginTop: 2, fontSize: 12 },
  when: { color: COLORS.sage, fontWeight: "700" },
  slot: { color: COLORS.dim },

  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.badgeDone,
  },
  badgeText: { color: "white", fontWeight: "700", fontSize: 12 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 18,
    width: "100%",
    maxWidth: 620,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 6 
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },

  logout: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  logoutText: { color: "white", fontWeight: "700" }
});