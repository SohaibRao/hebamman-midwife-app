import { useAuth } from "@/context/AuthContext";
import { Link } from "expo-router";
import React from "react";
import {
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

// ---- Appointments helpers (reuse the list look & feel) ----
import {
  Appointment as Appt,
  codeColor,
  formatTime,
  mockAppointments,
} from "@/components/appointments/types";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49", // CTA green
  sage: "#7F9086",
  badgePending: "#EAB308",
  badgeDone: "#22C55E",
  badgeGray: "#9CA3AF",
};

// Keep your requests mock for now
type RequestItem = {
  id: string;
  patientName: string;
  requestType: "cancel" | "reschedule" | "other";
  status: "pending" | "completed";
  createdISO: string;
};

const MOCK_REQUESTS: RequestItem[] = [
  { id: "r1", patientName: "Anna Müller",   requestType: "reschedule", status: "pending",   createdISO: "2025-09-01T09:10:00Z" },
  { id: "r2", patientName: "Lena Schmidt",  requestType: "cancel",     status: "completed", createdISO: "2025-09-01T08:55:00Z" },
  { id: "r3", patientName: "Mia Weber",     requestType: "reschedule", status: "pending",   createdISO: "2025-09-01T07:40:00Z" },
  { id: "r4", patientName: "Emma Fischer",  requestType: "other",      status: "completed", createdISO: "2025-09-01T06:25:00Z" },
  { id: "r5", patientName: "Sofia Becker",  requestType: "cancel",     status: "pending",   createdISO: "2025-09-01T05:00:00Z" },
  { id: "r6", patientName: "Nora Wagner",   requestType: "reschedule", status: "completed", createdISO: "2025-08-31T17:20:00Z" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

export default function Dashboard() {
 const { user, logout } = useAuth();

 console.log("user data is: ", user)

 // 1) Get profile by userId, then get midwifeId (_id)
  const { data: profile, status: pStatus, error: pError } = useMidwifeProfile(user?.id);
  const midwifeId = profile?._id;

  // 2) Fetch leads by midwifeId
  const { upcoming, loading: leadsLoading } = useLeads(midwifeId);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const upcomingLeads5 = React.useMemo(() => upcoming.slice(0, 5), [upcoming]);

  // ---- Appointments: latest 5 (from our appointments module mock for now) ----
  const upcomingApp5: Appt[] = React.useMemo(
    () =>
      [...mockAppointments]
        .sort((a, b) => +new Date(a.startISO) - +new Date(b.startISO))
        .slice(0, 5),
    []
  );

  // ---- Requests: latest 5 (keep your mock) ----
  const requests5 = React.useMemo(
    () =>
      [...MOCK_REQUESTS]
        .sort((a, b) => +new Date(b.createdISO) - +new Date(a.createdISO))
        .slice(0, 5),
    []
  );

  const activePatientsCount = 18; // placeholder — swap with API later

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

      {/* A1/A2 Consultation (Leads) */}
      <SectionHeader
        title="A1/A2 Consultation (Leads)"
        action={
          <Link href={{ pathname: "/(app)/leads" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkBtnText}>See all leads</Text></TouchableOpacity>
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

      {/* Upcoming Appointments (use the new list-row style; latest 5) */}
      <SectionHeader
        title="Upcoming Appointments"
        action={
          <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkBtnText}>See all appointments</Text></TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {upcomingApp5.map((a, i) => (
          <View key={a.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={[styles.dot, { backgroundColor: codeColor(a.serviceCode) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{a.serviceCode} - {a.title}</Text>
              <Text style={styles.rowSub}>{a.patientName} ({a.patientShort})</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.when}>{formatDate(a.startISO)}</Text>
              <Text style={styles.slot}>{formatTime(a.startISO)} · {a.durationMin}m</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Requests from Patients (unchanged) */}
      <SectionHeader
        title="Requests from Patients"
        action={
          <Link href={{ pathname: "/(app)/requests" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkBtnText}>See more requests</Text></TouchableOpacity>
          </Link>
        }
      />
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

      <TouchableOpacity onPress={logout} style={styles.logout}>
  <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>

<Link href={{ pathname: "/(app)/profile" } as any} asChild>
  <TouchableOpacity style={styles.linkBtn}>
    <Text style={styles.linkBtnText}>Open Profile</Text>
  </TouchableOpacity>
</Link>

<Link href={{ pathname: "/(app)/patients" } as any} asChild>
  <TouchableOpacity style={styles.linkBtn}>
    <Text style={styles.linkBtnText}>Open patients</Text>
  </TouchableOpacity>
</Link>

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

function StatusBadge({ status }: { status: "pending" | "completed" }) {
  const bg = status === "pending" ? COLORS.badgePending : COLORS.badgeDone;
  const text = status === "pending" ? "Pending" : "Completed";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{text}</Text>
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

  // Shared row style (matches AppointmentList look)
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
  rowSubSmall: { color: COLORS.dim, marginTop: 2, fontSize: 12 },
  when: { color: COLORS.sage, fontWeight: "700" },
  slot: { color: COLORS.dim },

  // small colored service dot (for appointments)
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

  // Modal
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },


  logout: {
   marginTop: 20,
   backgroundColor: COLORS.accent,
   paddingVertical: 14,
   borderRadius: 14,
   alignItems: "center",
   marginBottom: 8, // a little breathing room at the very end
 },
  logoutText: { color: "white", fontWeight: "700" }

});
