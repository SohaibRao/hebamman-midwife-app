// components/appointments/CalendarView.tsx
import React, { useState, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  line: "#E5E7EB",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

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

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.sage;

const getStatusBadgeStyle = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || "active";
  const styles: Record<string, any> = {
    active: { backgroundColor: "#D1FAE5", color: "#065F46" },
    pending: { backgroundColor: "#FEF3C7", color: "#92400E" },
    cancelled: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  };
  return styles[normalizedStatus] || styles.active;
};

type UiApt = {
  serviceCode: string;
  dateObj: Date;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  clientId?: string;
  midwifeId: string;
};

type CalendarMonth = {
  y: number;
  m: number;
  key: string;
  title: string;
};

type Props = {
  months: CalendarMonth[];
  apptsByDay: Record<string, UiApt[]>;
  onPressAppt: (apt: UiApt) => void;
  onPressEdit: (apt: UiApt) => void;
  getPatientName: (clientId?: string) => string;
};

export default function CalendarView({
  months,
  apptsByDay,
  onPressAppt,
  onPressEdit,
  getPatientName,
}: Props) {
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewRef = useRef((viewableItems: any) => {
    if (viewableItems.viewableItems.length > 0) {
      const newIndex = viewableItems.viewableItems[0].index;
      if (newIndex !== index && newIndex !== null) {
        setIndex(newIndex);
      }
    }
  });

  const go = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(months.length - 1, index + dir));
    if (next !== index) {
      setIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  if (months.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.card}>
          <Text style={styles.emptyText}>No months to display.</Text>
        </View>
      </View>
    );
  }

  const currentMonth = months[index] || months[0];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.navigationRow}>
        <TouchableOpacity
          onPress={() => go(-1)}
          disabled={index === 0}
          style={[styles.navButton, index === 0 && styles.navButtonDisabled]}
        >
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth?.title || "—"}</Text>
        <TouchableOpacity
          onPress={() => go(1)}
          disabled={index === months.length - 1}
          style={[styles.navButton, index === months.length - 1 && styles.navButtonDisabled]}
        >
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Months Carousel */}
      <FlatList
        ref={flatListRef}
        data={months}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={styles.monthContainer}>
            <MonthCard
              year={item.y}
              monthIndex={item.m}
              apptsByDay={apptsByDay}
              onPressAppt={onPressAppt}
              onPressEdit={onPressEdit}
              getPatientName={getPatientName}
            />
          </View>
        )}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

// Month Card Component
function MonthCard({
  year,
  monthIndex,
  apptsByDay,
  onPressAppt,
  onPressEdit,
  getPatientName,
}: {
  year: number;
  monthIndex: number;
  apptsByDay: Record<string, UiApt[]>;
  onPressAppt: (apt: UiApt) => void;
  onPressEdit: (apt: UiApt) => void;
  getPatientName: (clientId?: string) => string;
}) {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const [selected, setSelected] = useState<Date | null>(null);
  const [showApptModal, setShowApptModal] = useState(false);
  const selectedKey = selected ? toDMY(selected) : null;
  const list = selectedKey ? apptsByDay[selectedKey] ?? [] : [];

  const handleDatePress = (date: Date) => {
    const key = toDMY(date);
    const dayApts = apptsByDay[key] ?? [];

    if (dayApts.length > 0) {
      setSelected(date);
      setShowApptModal(true);
    }
  };

  return (
    <>
      <View style={styles.card}>
        {/* Week Header */}
        <View style={styles.weekHeader}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={styles.weekHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {Array.from({ length: startWeekday }).map((_, i) => (
            <View key={`lead-${i}`} style={styles.gridCell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const d = new Date(year, monthIndex, idx + 1);
            const key = toDMY(d);
            const dayApts = apptsByDay[key] ?? [];

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.gridCell,
                  dayApts.length > 0 && styles.gridCellWithApts,
                ]}
                onPress={() => handleDatePress(d)}
                disabled={dayApts.length === 0}
              >
                <Text
                  style={[
                    styles.gridDay,
                    dayApts.length > 0 && styles.gridDayWithApts,
                  ]}
                >
                  {idx + 1}
                </Text>
                {dayApts.length > 0 && (
                  <View style={styles.dotRow}>
                    {dayApts.slice(0, 3).map((apt, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: codeColor(apt.serviceCode) },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Helper Text */}
        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>
            Tap on a highlighted date to view appointments
          </Text>
        </View>
      </View>

      {/* Appointments Modal */}
      <AppointmentsModal
        visible={showApptModal}
        selectedDate={selected}
        appointments={list}
        onClose={() => setShowApptModal(false)}
        onPressAppt={onPressAppt}
        onPressEdit={onPressEdit}
        getPatientName={getPatientName}
      />
    </>
  );
}

// Appointments Modal Component
function AppointmentsModal({
  visible,
  selectedDate,
  appointments,
  onClose,
  onPressAppt,
  onPressEdit,
  getPatientName,
}: {
  visible: boolean;
  selectedDate: Date | null;
  appointments: UiApt[];
  onClose: () => void;
  onPressAppt: (apt: UiApt) => void;
  onPressEdit: (apt: UiApt) => void;
  getPatientName: (clientId?: string) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDate ? fmtDateShort(selectedDate) : "Appointments"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            {appointments.length === 0 ? (
              <Text style={styles.emptyModalText}>No appointments on this day.</Text>
            ) : (
              appointments.map((item) => {
                const isCancelled = item.status?.toLowerCase() === "cancelled";
                const statusStyle = getStatusBadgeStyle(item.status);

                return (
                  <View key={`${item.serviceCode}-${item.appointmentId}`} style={styles.aptRow}>
                    <View
                      style={[styles.aptDot, { backgroundColor: codeColor(item.serviceCode) }]}
                    />
                    <View style={styles.aptContent}>
                      <View style={styles.aptHeader}>
                        <Text style={styles.aptTitle}>
                          {item.serviceCode} • {getPatientName(item.clientId)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.backgroundColor },
                          ]}
                        >
                          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                            {(item.status || "active").toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.aptTime}>
                        {item.startTime}–{item.endTime} • {item.duration}m
                      </Text>
                    </View>
                    <View style={styles.aptActions}>
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          onPressAppt(item);
                        }}
                        style={styles.detailsButton}
                      >
                        <Text style={styles.detailsButtonText}>Details</Text>
                      </TouchableOpacity>
                      {!isCancelled && (
                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            onPressEdit(item);
                          }}
                          style={styles.editButton}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 16,
  },
  navigationRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF3F1",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  monthContainer: {
    width: SCREEN_WIDTH,
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    width: 360,
    height: 380,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekHeader: {
    flexDirection: "row",
    paddingBottom: 6,
  },
  weekHeaderText: {
    color: COLORS.dim,
    fontWeight: "700",
    textAlign: "center",
    width: "14.28%",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 10,
  },
  gridCell: {
    width: "14.28%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#F4F6F5",
    padding: 4,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  gridCellWithApts: {
    backgroundColor: "#EAF1EE",
  },
  gridDay: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 14,
  },
  gridDayWithApts: {
    fontWeight: "800",
    color: COLORS.accent,
  },
  dotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginTop: 4,
    justifyContent: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  helperTextContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  helperText: {
    color: COLORS.dim,
    fontSize: 13,
    textAlign: "center",
  },
  emptyText: {
    color: COLORS.dim,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontWeight: "800",
    color: COLORS.dim,
    fontSize: 20,
  },
  modalScroll: {
    marginTop: 12,
  },
  emptyModalText: {
    color: COLORS.dim,
    textAlign: "center",
    padding: 20,
  },
  aptRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  aptDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  aptContent: {
    flex: 1,
  },
  aptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  aptTitle: {
    fontWeight: "700",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  aptTime: {
    color: COLORS.dim,
    marginTop: 2,
  },
  aptActions: {
    gap: 8,
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  detailsButtonText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  editButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  modalFooter: {
    marginTop: 16,
  },
  closeModalButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "white",
    fontWeight: "800",
  },
});