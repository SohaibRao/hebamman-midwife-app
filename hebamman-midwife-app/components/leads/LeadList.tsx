// components/leads/LeadList.tsx
import { Lead, leadAddress, leadDisplayDate } from "@/hooks/useLeads";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const COLORS = {
  text: "#1D1D1F",
  dim: "#5C6B63",
  card: "#FFFFFF",
  accent: "#2E5A49",
  badgePending: "#EAB308",
  badgeDone: "#22C55E",
  line: "#E5E7EB",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const bg = s === "completed" ? COLORS.badgeDone : COLORS.badgePending;
  const label = s === "completed" ? "Completed" : (status ?? "Pending");
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function LeadList({
  data,
  loading,
  onPressMore,
  onRefresh,
  emptyText = "No leads found.",
}: {
  data: Lead[];
  loading?: boolean;
  onPressMore: (lead: Lead) => void;
  onRefresh?: () => void;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item._id}
      refreshing={!!loading}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 10, flexGrow: 1 }}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <Text style={{ color: COLORS.dim }}>{emptyText}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.name}>{item.fullName}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.line}><Text style={styles.label}>Date:</Text> {leadDisplayDate(item)} <Text style={styles.label}>Slot:</Text> {item.selectedSlot ?? "—"}</Text>
          <Text style={styles.line}><Text style={styles.label}>Email:</Text> {item.email}   <Text style={styles.label}>Phone:</Text> {item.phoneNumber}</Text>
          <Text style={styles.line}><Text style={styles.label}>Address:</Text> {leadAddress(item)}</Text>

          <TouchableOpacity onPress={() => onPressMore(item)} style={styles.moreBtn}>
            <Text style={styles.moreText}>More details</Text>
          </TouchableOpacity>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  name: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  label: { color: COLORS.dim, fontWeight: "700" },
  line: { color: COLORS.text, marginTop: 6 },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreText: { color: COLORS.accent, fontWeight: "700" },
});
