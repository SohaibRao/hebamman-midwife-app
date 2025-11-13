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

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  line: "#E5E7EB",
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
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

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
            <Text style={styles.modalTitle}>Reschedule {appointment.serviceCode}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!timetable ? (
            <Text style={styles.errorText}>No timetable found for this midwife.</Text>
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
                  style={styles.navButton}
                >
                  <Text style={styles.navButtonText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Week Header */}
              <View style={styles.weekHeader}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
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
                  {selectedDate ? `Slots on ${fmtDateShort(selectedDate)}` : "Select a date"}
                </Text>
                {!selectedDate ? (
                  <Text style={styles.helperText}>Pick a date to see available slots.</Text>
                ) : availableSlots.length === 0 ? (
                  <Text style={styles.helperText}>No free slots on this date.</Text>
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
                <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
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
                  {submitting ? "Saving…" : "Save Changes"}
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
          {show ? "− Hide" : "+ Book"} custom time slot
        </Text>
      </TouchableOpacity>

      {show && (
        <View style={styles.customTimeContainer}>
          <Text style={styles.customTimeTitle}>Custom Time Slot</Text>

          <View style={styles.availableTimeBox}>
            <Text style={styles.availableTimeLabel}>Available Time Today:</Text>
            {availableTimeRanges.map((range, idx) => (
              <Text key={idx} style={styles.availableTimeText}>
                {range}
              </Text>
            ))}
          </View>

          <View style={styles.timeInputSection}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <View style={styles.timePickerContainer}>
              <ScrollView style={styles.timePicker} nestedScrollEnabled>
                {filterTimeOptions(availableTimeRanges).length === 0 ? (
                  <View style={styles.emptyTimePicker}>
                    <Text style={styles.emptyTimeText}>No available time slots</Text>
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
            <Text style={styles.inputLabel}>End Time (Auto-calculated)</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledInputText}>
                {customEndTime || "Will be calculated automatically"}
              </Text>
            </View>
          </View>

          {customStartTime && customEndTime && (
            <Text style={styles.durationText}>
              Duration: {getServiceDuration(serviceCode)} minutes
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
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
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
  errorText: {
    color: "crimson",
    padding: 12,
  },
  scrollView: {
    maxHeight: 600,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 8,
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF3F1",
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  gridCellDisabled: {
    opacity: 0.3,
  },
  gridCellSelected: {
    backgroundColor: "#E7ECEA",
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
    marginTop: 16,
    paddingBottom: 12,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  helperText: {
    color: COLORS.dim,
    fontSize: 13,
  },
  slotsList: {
    gap: 8,
  },
  slotCard: {
    backgroundColor: "#F4F6F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  slotCardActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  slotText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  slotTextActive: {
    color: "white",
  },
  customTimeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  customTimeToggle: {
    paddingVertical: 8,
  },
  customTimeToggleText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  customTimeContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FBFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  customTimeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  availableTimeBox: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 12,
  },
  availableTimeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 8,
  },
  availableTimeText: {
    fontSize: 12,
    color: "#16a34a",
    marginBottom: 4,
  },
  timeInputSection: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 6,
  },
  timePickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    maxHeight: 150,
  },
  timePicker: {
    maxHeight: 150,
  },
  emptyTimePicker: {
    padding: 12,
  },
  emptyTimeText: {
    color: COLORS.dim,
    textAlign: "center",
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.accent,
  },
  timeOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeOptionTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  disabledInput: {
    backgroundColor: "#F4F6F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
  disabledInputText: {
    color: COLORS.dim,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.dim,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  cancelButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});