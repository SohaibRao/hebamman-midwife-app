// components/appointments/ReactivateAppointmentModal.tsx
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

type UiApt = {
  serviceCode: string;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  midwifeId: string;
};

type Timetable = {
  [weekday: string]: {
    slots: {
      [service: string]: { startTime: string; endTime: string }[];
    };
  };
};

type Props = {
  visible: boolean;
  appointment: UiApt | null;
  timetable: Timetable | undefined;
  validDatesSet: Set<string>;
  availableSlots: { startTime: string; endTime: string }[];
  isReactivating: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  onSlotSelect: (slot: { startTime: string; endTime: string }) => void;
  onReactivate: () => void;
  selectedDate: Date | null;
  selectedSlot: { startTime: string; endTime: string } | null;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const fmtDateShort = (d: Date) =>
  d.toLocaleDateString('de-DE', { weekday: "short", day: "2-digit", month: "short" });

export default function ReactivateAppointmentModal({
  visible,
  appointment,
  timetable,
  validDatesSet,
  availableSlots,
  isReactivating,
  onClose,
  onDateChange,
  onSlotSelect,
  onReactivate,
  selectedDate,
  selectedSlot,
}: Props) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  if (!appointment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {de.appointments.reactivateAppointment} {appointment.serviceCode}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!timetable ? (
            <Text style={styles.errorText}>Kein Zeitplan für diese Hebamme gefunden.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* Info Box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Wählen Sie ein neues Datum und eine neue Uhrzeit, um diesen Termin zu reaktivieren
                </Text>
              </View>

              {/* Month Navigation */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                    )
                  }
                  style={styles.navButton}
                >
                  <Text style={styles.navButtonText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {calendarMonth.toLocaleDateString('de-DE', {
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
                  style={styles.navButton}
                >
                  <Text style={styles.navButtonText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Week Header */}
              <View style={styles.weekHeader}>
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d) => (
                  <Text key={d} style={styles.weekHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <CalendarGrid
                month={calendarMonth}
                validDatesSet={validDatesSet}
                selectedDate={selectedDate}
                onDateSelect={onDateChange}
              />

              {/* Available Slots */}
              <View style={styles.slotsSection}>
                <Text style={styles.slotsTitle}>
                  {selectedDate
                    ? `Verfügbare Slots am ${fmtDateShort(selectedDate)}`
                    : "Wählen Sie ein Datum"}
                </Text>
                {!selectedDate ? (
                  <Text style={styles.helperText}>Wählen Sie ein Datum, um verfügbare Slots anzuzeigen.</Text>
                ) : availableSlots.length === 0 ? (
                  <Text style={styles.helperText}>Keine freien Slots an diesem Datum.</Text>
                ) : (
                  <View style={styles.slotsList}>
                    {availableSlots.map((s) => {
                      const chosen =
                        selectedSlot &&
                        selectedSlot.startTime === s.startTime &&
                        selectedSlot.endTime === s.endTime;
                      return (
                        <TouchableOpacity
                          key={`${s.startTime}-${s.endTime}`}
                          onPress={() => onSlotSelect(s)}
                          style={[styles.slotCard, chosen && styles.slotCardActive]}
                        >
                          <Text style={[styles.slotText, chosen && styles.slotTextActive]}>
                            {s.startTime} – {s.endTime}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isReactivating}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>{de.actions.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onReactivate}
                  disabled={isReactivating || !selectedDate || !selectedSlot}
                  style={[
                    styles.reactivateButton,
                    (isReactivating || !selectedDate || !selectedSlot) &&
                      styles.reactivateButtonDisabled,
                  ]}
                >
                  {isReactivating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.reactivateButtonText}>Reaktivieren</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Calendar Grid Component
function CalendarGrid({
  month,
  validDatesSet,
  selectedDate,
  onDateSelect,
}: {
  month: Date;
  validDatesSet: Set<string>;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];

  // Empty cells before month starts
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.gridCell} />);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    const dateKey = toDMY(date);
    const isValid = validDatesSet.has(dateKey) && date >= today;
    const isSelected = selectedDate && sameDay(date, selectedDate);

    cells.push(
      <TouchableOpacity
        key={day}
        style={[
          styles.gridCell,
          !isValid && styles.gridCellDisabled,
          isSelected && styles.gridCellSelected,
        ]}
        onPress={() => isValid && onDateSelect(date)}
        disabled={!isValid}
      >
        <Text style={[styles.gridDay, isSelected && styles.gridDaySelected]}>{day}</Text>
      </TouchableOpacity>
    );
  }

  return <View style={styles.grid}>{cells}</View>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
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
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontWeight: "800",
    color: COLORS.textSecondary,
    fontSize: 20,
  },
  errorText: {
    color: COLORS.error,
    padding: SPACING.md,
  },
  scrollView: {
    maxHeight: 600,
  },
  infoBox: {
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.lg,
  },
  infoText: {
    color: COLORS.info,
    fontSize: 13,
    fontWeight: "600",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  navButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundGray,
  },
  navButtonText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },
  weekHeader: {
    flexDirection: "row",
    paddingBottom: SPACING.xs,
  },
  weekHeaderText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    textAlign: "center",
    width: "14.28%",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: SPACING.sm,
  },
  gridCell: {
    width: "14.28%",
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundGray,
    padding: SPACING.xs,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  gridCellDisabled: {
    opacity: 0.3,
  },
  gridCellSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  gridDay: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 14,
  },
  gridDaySelected: {
    fontWeight: "800",
  },
  slotsSection: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  slotsList: {
    gap: SPACING.sm,
  },
  slotCard: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  slotCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  slotTextActive: {
    color: COLORS.background,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  reactivateButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  reactivateButtonDisabled: {
    opacity: 0.6,
  },
  reactivateButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "800",
  },
});