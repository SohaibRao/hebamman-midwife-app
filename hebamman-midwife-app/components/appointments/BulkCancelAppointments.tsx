// components/BulkCancelAppointments.tsx
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

// -------------------- Theme --------------------
const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  green: "#22C55E",
  red: "#DC2626",
  line: "#E5E7EB",
};

// -------------------- Types --------------------
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
};

type BulkCancelAppointmentsProps = {
  visible: boolean;
  onClose: () => void;
  midwifeId: string;
  allAppointments: UiApt[];
  onSuccess: () => void;
  getPatientName: (clientId?: string) => string;
};

// -------------------- Helpers --------------------
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

const getCurrentTime = (): string => {
  const now = new Date();
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  return `${hours}:${minutes}`;
};

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

const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.sage;

// -------------------- Component --------------------
export default function BulkCancelAppointments({
  visible,
  onClose,
  midwifeId,
  allAppointments,
  onSuccess,
  getPatientName,
}: BulkCancelAppointmentsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [isCanceling, setIsCanceling] = useState(false);

  // Get all unique dates with appointments (only future dates)
  const datesWithAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateSet = new Set<string>();
    allAppointments.forEach((apt) => {
      const aptDate = new Date(apt.dateObj);
      aptDate.setHours(0, 0, 0, 0);
      
      // Only include today or future dates
      if (aptDate >= today && apt.status?.toLowerCase() !== "cancelled") {
        dateSet.add(toDMY(apt.dateObj));
      }
    });

    return Array.from(dateSet).map((dateStr) => {
      const [dd, mm, yyyy] = dateStr.split("/").map(Number);
      return new Date(yyyy, mm - 1, dd);
    });
  }, [allAppointments]);

  // Get appointments for selected date (excluding cancelled)
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];

    return allAppointments.filter(
      (apt) =>
        sameDay(apt.dateObj, selectedDate) &&
        apt.status?.toLowerCase() !== "cancelled"
    );
  }, [selectedDate, allAppointments]);

  // Reset state when modal closes
  const handleClose = () => {
    if (!isCanceling) {
      setSelectedDate(null);
      setCalendarMonth(new Date());
      onClose();
    }
  };

  // Handle bulk cancel
  const handleBulkCancel = async () => {
    if (!selectedDate) {
      Alert.alert("Error", "Please select a date first");
      return;
    }

    if (selectedDateAppointments.length === 0) {
      Alert.alert("Error", "No active appointments found for this date");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const isToday = sameDay(today, selected);

    // Determine time parameter
    const timeParam = isToday ? getCurrentTime() : null;

    // Show confirmation
    const confirmMessage = isToday
      ? `Are you sure you want to cancel all appointments on ${fmtDateShort(selectedDate)} starting from ${timeParam}?\n\nThis will cancel ${selectedDateAppointments.length} appointment(s).`
      : `Are you sure you want to cancel all ${selectedDateAppointments.length} appointment(s) on ${fmtDateShort(selectedDate)}?`;

    Alert.alert("Confirm Bulk Cancel", confirmMessage, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes, Cancel All",
        style: "destructive",
        onPress: async () => {
          setIsCanceling(true);

          try {
            const body: any = {
              midwifeId,
              date: toDMY(selectedDate),
              time: timeParam,
            };

            const response = await api("/api/public/bulk-cancelAppointments", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });

            const result = await response.json();

            if (response.ok && result.success) {
              Alert.alert(
                "Success",
                result.message || "Appointments cancelled successfully",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      handleClose();
                      onSuccess();
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                "Error",
                result.error || result.details || "Failed to cancel appointments"
              );
            }
          } catch (error: any) {
            console.error("Bulk cancel error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
          } finally {
            setIsCanceling(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { maxWidth: 450, maxHeight: "90%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bulk Cancel Appointments</Text>
            <TouchableOpacity onPress={handleClose} disabled={isCanceling}>
              <Ionicons name="close" size={24} color={COLORS.dim} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Instructions */}
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                Select a date to view and cancel all appointments for that day
              </Text>
            </View>

            {/* Month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                  )
                }
                style={styles.monthNavBtn}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {calendarMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                  )
                }
                style={styles.monthNavBtn}
              >
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Week header */}
            <View style={styles.weekHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text key={d} style={styles.weekHdrText}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {(() => {
                const firstDay = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  1
                );
                const startWeekday = firstDay.getDay();
                const daysInMonth = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth() + 1,
                  0
                ).getDate();
                const cells = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Empty cells before month starts
                for (let i = 0; i < startWeekday; i++) {
                  cells.push(<View key={`empty-${i}`} style={styles.gridCell} />);
                }

                // Days of month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth(),
                    day
                  );
                  date.setHours(0, 0, 0, 0);

                  const hasAppointments = datesWithAppointments.some((d) =>
                    sameDay(d, date)
                  );
                  const isSelected = selectedDate && sameDay(date, selectedDate);
                  const isPast = date < today;

                  cells.push(
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.gridCell,
                        isPast && styles.gridCellPast,
                        hasAppointments && styles.gridCellWithApts,
                        isSelected && styles.gridCellSelected,
                      ]}
                      onPress={() => {
                        if (!isPast && hasAppointments) {
                          setSelectedDate(date);
                        }
                      }}
                      disabled={isPast || !hasAppointments}
                    >
                      <Text
                        style={[
                          styles.gridDay,
                          isPast && styles.gridDayPast,
                          isSelected && styles.gridDaySelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {hasAppointments && !isPast && (
                        <View style={styles.appointmentIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                }

                return cells;
              })()}
            </View>

            {/* Selected date appointments */}
            {selectedDate && (
              <View style={styles.selectedDateSection}>
                <Text style={styles.selectedDateTitle}>
                  Appointments on {fmtDateShort(selectedDate)}
                </Text>

                {selectedDateAppointments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No active appointments on this date
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.appointmentCount}>
                      {selectedDateAppointments.length} appointment(s) will be cancelled
                    </Text>

                    <View style={styles.appointmentsList}>
                      {selectedDateAppointments.map((apt, index) => (
                        <View key={`${apt.serviceCode}-${apt.appointmentId}`} style={styles.appointmentItem}>
                          <View
                            style={[
                              styles.appointmentDot,
                              { backgroundColor: codeColor(apt.serviceCode) },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.appointmentService}>
                              {apt.serviceCode} • {getPatientName(apt.clientId)}
                            </Text>
                            <Text style={styles.appointmentTime}>
                              {apt.startTime} – {apt.endTime} ({apt.duration}m)
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Warning box */}
                    <View style={styles.warningBox}>
                      <View style={styles.warningContent}>
                        <Ionicons name="warning-outline" size={20} color="#92400E" />
                        <Text style={styles.warningText}>
                          This action cannot be undone. All listed appointments will be
                          cancelled.
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isCanceling}
              style={[styles.secondaryBtn, { flex: 1 }]}
            >
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBulkCancel}
              disabled={
                isCanceling ||
                !selectedDate ||
                selectedDateAppointments.length === 0
              }
              style={[
                styles.cancelBtn,
                { flex: 1 },
                (isCanceling ||
                  !selectedDate ||
                  selectedDateAppointments.length === 0) && { opacity: 0.5 },
              ]}
            >
              {isCanceling ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel All Appointments</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  instructionBox: {
    backgroundColor: "#DBEAFE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "600",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 8,
  },
  monthNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EEF3F1",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  weekHeader: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  weekHdrText: {
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  gridCellPast: {
    opacity: 0.3,
  },
  gridCellWithApts: {
    backgroundColor: "#E7F2EF",
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  gridCellSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  gridDay: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: 14,
  },
  gridDayPast: {
    color: COLORS.dim,
  },
  gridDaySelected: {
    color: "white",
    fontWeight: "800",
  },
  appointmentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 2,
  },
  selectedDateSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  appointmentCount: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 12,
  },
  appointmentsList: {
    gap: 10,
    marginBottom: 16,
  },
  appointmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  appointmentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  appointmentService: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 12,
    color: COLORS.dim,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: COLORS.dim,
    fontSize: 14,
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 15,
  },
  cancelBtn: {
    backgroundColor: COLORS.red,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});