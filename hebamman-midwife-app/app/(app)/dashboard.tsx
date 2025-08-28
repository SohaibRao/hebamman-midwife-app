import { Link } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/context/AuthContext";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49", // CTA green
  sage: "#7F9086",
  badgePending: "#EAB308",   // amber-ish
  badgeDone: "#22C55E",      // green
  badgeGray: "#9CA3AF",      // gray
};

type Appointment = {
  id: string;
  patientName: string;
  serviceName: string;
  startISO: string; // e.g. "2025-09-05T10:30:00Z"
};

type RequestItem = {
  id: string;
  patientName: string;
  requestType: "cancel" | "reschedule" | "other";
  status: "pending" | "completed";
  createdISO: string;
};

// ---------- TEMP MOCK DATA (replace with API later) ----------
const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "a1", patientName: "Anna Müller",    serviceName: "Vorsorge",    startISO: "2025-09-02T08:30:00Z" },
  { id: "a2", patientName: "Lea Schneider",  serviceName: "Wochenbett",  startISO: "2025-09-02T10:00:00Z" },
  { id: "a3", patientName: "Mia Weber",      serviceName: "Geburtsvor.", startISO: "2025-09-03T12:15:00Z" },
  { id: "a4", patientName: "Emma Fischer",   serviceName: "Stillberatung",startISO:"2025-09-03T14:00:00Z" },
  { id: "a5", patientName: "Sofia Becker",   serviceName: "Vorsorge",    startISO: "2025-09-04T09:00:00Z" },
  { id: "a6", patientName: "Nora Wagner",    serviceName: "Nachsorge",   startISO: "2025-09-04T11:30:00Z" },
];

const MOCK_REQUESTS: RequestItem[] = [
  { id: "r1", patientName: "Anna Müller",   requestType: "reschedule", status: "pending",   createdISO: "2025-09-01T09:10:00Z" },
  { id: "r2", patientName: "Lena Schmidt",  requestType: "cancel",     status: "completed", createdISO: "2025-09-01T08:55:00Z" },
  { id: "r3", patientName: "Mia Weber",     requestType: "reschedule", status: "pending",   createdISO: "2025-09-01T07:40:00Z" },
  { id: "r4", patientName: "Emma Fischer",  requestType: "other",      status: "completed", createdISO: "2025-09-01T06:25:00Z" },
  { id: "r5", patientName: "Sofia Becker",  requestType: "cancel",     status: "pending",   createdISO: "2025-09-01T05:00:00Z" },
  { id: "r6", patientName: "Nora Wagner",   requestType: "reschedule", status: "completed", createdISO: "2025-08-31T17:20:00Z" },
];
// ------------------------------------------------------------

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  // keep it simple and locale-friendly
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Dashboard() {
  const { user } = useAuth();

  const activePatientsCount = 18; // placeholder — replace with API count later
  const upcoming5 = useMemo(
    () =>
      [...MOCK_APPOINTMENTS]
        .sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO))
        .slice(0, 5),
    []
  );

  const requests5 = useMemo(
    () =>
      [...MOCK_REQUESTS]
        .sort((a, b) => +new Date(b.createdISO) - +new Date(a.createdISO))
        .slice(0, 5),
    []
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 16 }}>
      {/* Welcome */}
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.h1}>Welcome, {user?.username ?? "Rimsha"}</Text>
        <Text style={styles.sub}>Manage your patients & schedule at a glance.</Text>
      </View>

      {/* Stat: Active Patients */}
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Active Patients</Text>
        <Text style={styles.statValue}>{activePatientsCount}</Text>
      </View>

      {/* Upcoming Appointments */}
      <SectionHeader title="Upcoming Appointments" action={
        <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
          <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkBtnText}>See all appointments</Text></TouchableOpacity>
        </Link>
      } />

      <View style={styles.listCard}>
        {upcoming5.map((a, i) => (
          <View key={a.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{a.patientName}</Text>
              <Text style={styles.rowSub}>{a.serviceName}</Text>
            </View>
            <Text style={styles.when}>{formatDateTime(a.startISO)}</Text>
          </View>
        ))}
      </View>

      {/* Requests from Patients */}
      <SectionHeader title="Requests from Patients" action={
        <Link href={{ pathname: "/(app)/requests" } as any} asChild>
          <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkBtnText}>See more requests</Text></TouchableOpacity>
        </Link>
      } />

      <View style={styles.listCard}>
        {requests5.map((r, i) => (
          <View key={r.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.patientName}</Text>
              <Text style={styles.rowSub}>
                {r.requestType === "cancel" ? "Appointment Cancel" :
                 r.requestType === "reschedule" ? "Reschedule Request" :
                 "Request"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <StatusBadge status={r.status} />
              <Link href={{ pathname: "/(app)/requests" } as any} asChild>
                <TouchableOpacity style={styles.moreBtn}>
                  <Text style={styles.moreBtnText}>More details</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        ))}
      </View>
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

function StatusBadge({ status }: { status: "pending" | "completed" }) {
  const bg = status === "pending" ? COLORS.badgePending : COLORS.badgeDone;
  const text = status === "pending" ? "Pending" : "Completed";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{text}</Text>
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
    borderTopColor: "#E5E7EB",
  },
  rowTitle: { fontWeight: "700", color: COLORS.text },
  rowSub: { color: COLORS.dim, marginTop: 2 },
  when: { color: COLORS.sage, fontWeight: "700" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: { color: "white", fontWeight: "700", fontSize: 12 },

  moreBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreBtnText: { color: COLORS.accent, fontWeight: "700" },
});
