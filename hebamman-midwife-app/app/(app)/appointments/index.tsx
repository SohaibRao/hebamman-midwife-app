import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import {
  Appointment,
  mockAppointments,
  COLORS,
  codeColor,
  formatDateTimeRange,
} from "@/components/appointments/types";
import AppointmentList from "@/components/appointments/AppointmentList";
import AppointmentCalendar from "@/components/appointments/AppointmentCalendar";

type Tab = "list" | "calendar";

const LEGEND = [
  ["B1", "Pre Birth Visit"],
  ["B2", "Pre Birth Video"],
  ["C1", "Early Care Visit"],
  ["C2", "Early Care Video"],
  ["D1", "Late Care Visit"],
  ["D2", "Late Care Video"],
  ["E1", "Birth Training"],
  ["F1", "After Birth Gym"],
] as const;

export default function AppointmentsScreen() {
  const [tab, setTab] = useState<Tab>("list");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const appointments = useMemo(() => mockAppointments, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header + Tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "list" && styles.tabActive]}
            onPress={() => setTab("list")}
          >
            <Text style={[styles.tabText, tab === "list" && styles.tabTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "calendar" && styles.tabActive]}
            onPress={() => setTab("calendar")}
          >
            <Text style={[styles.tabText, tab === "calendar" && styles.tabTextActive]}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content takes full height */}
      <View style={{ flex: 1 }}>
        {tab === "list" ? (
          <>
            <AppointmentList
              appointments={appointments}
              onPressItem={setSelected}
              style={{ flex: 1 }}
            />

            {/* Legend as wrapped grid (only in List tab) */}
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Service codes</Text>
              <View style={styles.legendGrid}>
                {LEGEND.map(([code, label]) => (
                  <View key={code} style={styles.legendPill}>
                    <View style={[styles.dot, { backgroundColor: codeColor(code as any) }]} />
                    <Text style={styles.legendText}>{code} — {label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <AppointmentCalendar
            appointments={appointments}
            onPressEvent={setSelected}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Details Modal (only when selected) */}
      {selected && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelected(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selected.serviceCode} - {selected.title}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={{ fontWeight: "700", color: COLORS.dim }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10, gap: 10 }}>
                <Row label="Patient:" value={`${selected.patientName} (${selected.patientShort})`} />
                <Row label="Service Type:" value={selected.serviceType ?? "—"} />
                <Row label="Date:" value={new Date(selected.startISO).toLocaleDateString()} />
                <Row label="Time:" value={formatDateTimeRange(selected)} />
                <Row label="Duration:" value={`${selected.durationMin} minutes`} />
                {selected.expectedTerm && (
                  <Row label="Expected Term:" value={new Date(selected.expectedTerm).toLocaleDateString()} />
                )}
                {selected.description && <Row label="Description:" value={selected.description} />}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingHorizontal: 16, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  tabs: {
    backgroundColor: "#E7ECEA",
    borderRadius: 12,
    flexDirection: "row",
    padding: 4,
    gap: 6,
    alignSelf: "flex-start",
  },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { color: COLORS.dim, fontWeight: "700" },
  tabTextActive: { color: COLORS.text },

  legendCard: {
    backgroundColor: "white",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  legendTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F5F4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 10, height: 10, borderRadius: 6, marginRight: 8 },
  legendText: { color: COLORS.dim, fontWeight: "600" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.25)", alignItems: "center", justifyContent: "center", padding: 20 },
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  rowLabel: { width: 120, color: COLORS.dim, fontWeight: "600" },
  rowValue: { flex: 1, color: COLORS.text },
});
