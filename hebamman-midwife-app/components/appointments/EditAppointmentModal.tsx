// components/appointments/EditAppointmentModal.tsx
import React, { useState, useMemo, useCallback } from "react";
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
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

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
  submitting: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  onSlotSelect: (slot: { startTime: string; endTime: string }) => void;
  onSubmit: () => void;
  onCancelAppointment: () => void;
  selectedDate: Date | null;
  selectedSlot: { startTime: string; endTime: string } | null;
  // Custom time props
  showCustomTime: boolean;
  customStartTime: string;
  customEndTime: string;
  availableTimeRanges: string[];
  onToggleCustomTime: () => void;
  onCustomStartTimeChange: (time: string) => void;
  filterTimeOptions: (ranges: string[]) => string[];
  getServiceDuration: (code: string) => number;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const fmtDateShort = (d: Date) =>
  d.toLocaleDateString('de-DE', { weekday: "short", day: "2-digit", month: "short" });

export default function EditAppointmentModal({
  visible,
  appointment,
  timetable,
  validDatesSet,
  availableSlots,
  submitting,
  onClose,
  onDateChange,
  onSlotSelect,
  onSubmit,
  onCancelAppointment,
  selectedDate,
  selectedSlot,
  showCustomTime,
  customStartTime,
  customEndTime,
  availableTimeRanges,
  onToggleCustomTime,
  onCustomStartTimeChange,
  filterTimeOptions,
  getServiceDuration,
}: Props) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  if (!appointment) return null;

  const isSlotSelected = showCustomTime ? !!customStartTime : !!selectedSlot;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{de.appointments.editAppointment} {appointment.serviceCode}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!timetable ? (
            <Text style={styles.errorText}>Kein Zeitplan für diese Hebamme gefunden.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
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
                  {selectedDate ? `Slots am ${fmtDateShort(selectedDate)}` : "Wählen Sie ein Datum"}
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

                {/* Custom Time Option */}
                {selectedDate && (
                  <CustomTimeSection
                    show={showCustomTime}
                    onToggle={onToggleCustomTime}
                    customStartTime={customStartTime}
                    customEndTime={customEndTime}
                    availableTimeRanges={availableTimeRanges}
                    onStartTimeChange={onCustomStartTimeChange}
                    filterTimeOptions={filterTimeOptions}
                    getServiceDuration={getServiceDuration}
                    serviceCode={appointment.serviceCode}
                  />
                )}
              </View>

              {/* Cancel Appointment Button */}
              <TouchableOpacity onPress={onCancelAppointment} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{de.appointments.cancelAppointment}</Text>
              </TouchableOpacity>

              {/* Save Changes Button */}
              <TouchableOpacity
                onPress={onSubmit}
                disabled={submitting || !isSlotSelected}
                style={[
                  styles.saveButton,
                  (submitting || !isSlotSelected) && styles.saveButtonDisabled,
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? "Speichern…" : "Änderungen speichern"}
                </Text>
              </TouchableOpacity>
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

// Custom Time Section Component
function CustomTimeSection({
  show,
  onToggle,
  customStartTime,
  customEndTime,
  availableTimeRanges,
  onStartTimeChange,
  filterTimeOptions,
  getServiceDuration,
  serviceCode,
}: {
  show: boolean;
  onToggle: () => void;
  customStartTime: string;
  customEndTime: string;
  availableTimeRanges: string[];
  onStartTimeChange: (time: string) => void;
  filterTimeOptions: (ranges: string[]) => string[];
  getServiceDuration: (code: string) => number;
  serviceCode: string;
}) {
  return (
    <View style={styles.customTimeSection}>
      <TouchableOpacity onPress={onToggle} style={styles.customTimeToggle}>
        <Text style={styles.customTimeToggleText}>
          {show ? "− Ausblenden" : "+ Buchen"} benutzerdefinierter Zeitslot
        </Text>
      </TouchableOpacity>

      {show && (
        <View style={styles.customTimeContainer}>
          <Text style={styles.customTimeTitle}>Benutzerdefinierter Zeitslot</Text>

          <View style={styles.availableTimeBox}>
            <Text style={styles.availableTimeLabel}>Verfügbare Zeit heute:</Text>
            {availableTimeRanges.map((range, idx) => (
              <Text key={idx} style={styles.availableTimeText}>
                {range}
              </Text>
            ))}
          </View>

          <View style={styles.timeInputSection}>
            <Text style={styles.inputLabel}>Startzeit</Text>
            <View style={styles.timePickerContainer}>
              <ScrollView style={styles.timePicker} nestedScrollEnabled>
                {filterTimeOptions(availableTimeRanges).length === 0 ? (
                  <View style={styles.emptyTimePicker}>
                    <Text style={styles.emptyTimeText}>Keine verfügbaren Zeitslots</Text>
                  </View>
                ) : (
                  filterTimeOptions(availableTimeRanges).map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() => onStartTimeChange(time)}
                      style={[
                        styles.timeOption,
                        customStartTime === time && styles.timeOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          customStartTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.timeInputSection}>
            <Text style={styles.inputLabel}>Endzeit (Automatisch berechnet)</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledInputText}>
                {customEndTime || "Wird automatisch berechnet"}
              </Text>
            </View>
          </View>

          {customStartTime && customEndTime && (
            <Text style={styles.durationText}>
              Dauer: {getServiceDuration(serviceCode)} Minuten
            </Text>
          )}
        </View>
      )}
    </View>
  );
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
  customTimeSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customTimeToggle: {
    paddingVertical: SPACING.sm,
  },
  customTimeToggleText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  customTimeContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customTimeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  availableTimeBox: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  availableTimeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  availableTimeText: {
    fontSize: 12,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  timeInputSection: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timePickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 150,
  },
  timePicker: {
    maxHeight: 150,
  },
  emptyTimePicker: {
    padding: SPACING.md,
  },
  emptyTimeText: {
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  timeOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timeOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeOptionTextSelected: {
    color: COLORS.background,
    fontWeight: "700",
  },
  disabledInput: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    opacity: 0.6,
  },
  disabledInputText: {
    color: COLORS.textSecondary,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  cancelButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "800",
  },
});