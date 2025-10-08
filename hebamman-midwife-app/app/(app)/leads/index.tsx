// app/(app)/leads/index.tsx
import LeadList from "@/components/leads/LeadList";
import { useAuth } from "@/context/AuthContext";
import { Lead, leadAddress, leadDisplayDate, useLeads } from "@/hooks/useLeads";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";

const COLORS = {
  bg: "#F6F8F7",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  card: "#FFFFFF",
};

type Tab = "upcoming" | "past";

export default function LeadsScreen() {
  const { user } = useAuth();

  // 1) load profile by userId
  const { data: profile, status: pStatus, error: pError, refresh: pRefresh } = useMidwifeProfile(user?.id);

  // 2) extract the midwifeId from profile
  const midwifeId = profile?._id;

  // 3) fetch leads by midwifeId
  const { upcoming, past, loading, error, refresh } = useLeads(midwifeId);

  const [tab, setTab] = React.useState<Tab>("upcoming");
  const [selected, setSelected] = React.useState<Lead | null>(null);

  // combined states
  const combinedLoading = pStatus === "loading" || loading;
  const combinedError = pError || error;

  const data = tab === "upcoming" ? upcoming : past;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>A1/A2 Consultation (Leads)</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === "upcoming" && styles.tabActive]} onPress={() => setTab("upcoming")}>
            <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === "past" && styles.tabActive]} onPress={() => setTab("past")}>
            <Text style={[styles.tabText, tab === "past" && styles.tabTextActive]}>Past</Text>
          </TouchableOpacity>
        </View>
      </View>

      {combinedError && (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: "crimson" }}>{combinedError}</Text>
        </View>
      )}

      {/* If profile not ready yet, show a centered spinner */}
      {!midwifeId && pStatus === "loading" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <LeadList
          data={data}
          loading={combinedLoading}
          onPressMore={(lead) => setSelected(lead)}
          onRefresh={() => {
            // refresh both if needed
            if (!midwifeId) pRefresh();
            else refresh?.();
          }}
          emptyText={tab === "upcoming" ? "No upcoming leads." : "No past leads."}
        />
      )}

      {/* Details modal */}
      {selected && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelected(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lead Details</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={{ fontWeight: "700", color: COLORS.dim }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Row label="Name" value={selected.fullName} />
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phoneNumber} />
              <Row label="Date" value={leadDisplayDate(selected)} />
              <Row label="Slot" value={selected.selectedSlot ?? "—"} />
              <Row label="Insurance" value={`${selected.insuranceType ?? "—"} (${selected.insuranceCompany ?? "—"})`} />
              <Row label="Address" value={leadAddress(selected)} />
              <Row label="Status" value={selected.status ?? "pending"} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: 8, paddingHorizontal: 16 }}>
      <Text style={{ width: 110, color: COLORS.dim, fontWeight: "700" }}>{label}:</Text>
      <Text style={{ flex: 1, color: COLORS.text }}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  tabs: { backgroundColor: "#E7ECEA", borderRadius: 12, flexDirection: "row", padding: 4, gap: 6, alignSelf: "flex-start" },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.card },
  tabText: { color: "#5C6B63", fontWeight: "700" },
  tabTextActive: { color: COLORS.text },

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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
});
