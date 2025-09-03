import React, { useMemo } from "react";
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Appointment, codeColor, formatTime, groupByDay } from "./types";

export default function AppointmentList({
  appointments,
  onPressItem,
  style,
}: {
  appointments: Appointment[];
  onPressItem: (a: Appointment) => void;
  style?: any;
}) {
  const sections = useMemo(() => groupByDay(appointments), [appointments]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={style}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexGrow: 1,                 // ← ensures it can occupy full height
      }}
      renderSectionHeader={({ section }) => (
        <View style={styles.headerRow}>
          <Text style={styles.hDate}>{section.title}</Text>
          <Text style={styles.hCount}>
            {section.data.length} {section.data.length === 1 ? "appointment" : "appointments"}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => onPressItem(item)}>
          <View style={[styles.dot, { backgroundColor: codeColor(item.serviceCode) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.serviceCode} - {item.title}</Text>
            <Text style={styles.sub}>{item.patientName} ({item.patientShort})</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.time}>{formatTime(item.startISO)}</Text>
            <Text style={styles.duration}>{item.durationMin} min</Text>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
      stickySectionHeadersEnabled
    />
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingVertical: 10,
    backgroundColor: "#F3F5F4",
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  hDate: { fontWeight: "800", color: "#1D1D1F" },
  hCount: { color: "#5C6B63", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  title: { fontWeight: "700", color: "#1D1D1F" },
  sub: { color: "#5C6B63", marginTop: 2 },
  time: { fontWeight: "800", color: "#1D1D1F" },
  duration: { color: "#5C6B63" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
});
