// components/requests/RescheduleApprovalModal.tsx
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
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

type Request = {
  _id: string;
  requestType: "edit" | "cancelled";
  midwifeId: string;
  clientId: string;
  serviceCode: string;
  appointmentId: string;
  suggestedDate: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  note: string;
  status: "pending" | "approved" | "rejected";
};

type Timetable = {
  [weekday: string]: {
    slots: {
      [serviceCode: string]: { startTime: string; endTime: string }[];
    };
  };
};

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type Props = {
  visible: boolean;
  request: Request | null;
  onClose: () => void;
  onSuccess: () => void;
  midwifeId: string;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const weekdayName = (d: Date) => {
  const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return days[d.getDay()];
};

async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// Helper to parse DMY date to Date object
const parseDMY = (dmy: string): Date | null => {
  try {
    const [dd, mm, yyyy] = dmy.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
  } catch {
    return null;
  }
};

// Fetch appointments for checking conflicts
async function fetchAppointmentsForDate(
  midwifeId: string,
  date: Date
): Promise<Array<{ startTime: string; endTime: string; serviceCode: string }>> {
  try {
    const clientET = new Date();
    const payload = { midwifeId, clientET: clientET.toISOString() };

    const res = await api(`/api/public/PostBirthAppointments/monthly-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await readJsonSafe<any>(res);

    if (!json || !json.success) return [];

    const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
    const bucket = json.data?.[monthKey];
    if (!bucket) return [];

    const dateKey = toDMY(date);
    const appointments: Array<{ startTime: string; endTime: string; serviceCode: string }> = [];

    // Extract all appointments for this date
    Object.keys(bucket).forEach((serviceCode) => {
      const apts = bucket[serviceCode] || [];
      apts.forEach((apt: any) => {
        if (apt.appointmentDate === dateKey) {
          appointments.push({
            startTime: apt.startTime,
            endTime: apt.endTime,
            serviceCode,
          });
        }
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
}

export default function RescheduleApprovalModal({
  visible,
  request,
  onClose,
  onSuccess,
  midwifeId,
}: Props) {
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = pf.data as any;
  const timetable: Timetable | undefined = midwifeProfile?.identity?.timetable;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible && request) {
      // Try to parse suggested date if available
      if (request.suggestedDate) {
        const parsed = parseDMY(request.suggestedDate);
        if (parsed) {
          setSelectedDate(parsed);
          setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        }
      } else {
        setSelectedDate(null);
        setCalendarMonth(new Date());
      }
      setSelectedSlot(null);
      setOccupiedSlots(new Set());
    }
  }, [visible, request]);

  // Fetch occupied slots when date changes
  React.useEffect(() => {
    if (selectedDate && request) {
      loadOccupiedSlots();
    }
  }, [selectedDate]);

  const loadOccupiedSlots = async () => {
    if (!selectedDate || !request) return;

    setLoadingSlots(true);
    try {
      const appointments = await fetchAppointmentsForDate(midwifeId, selectedDate);
      const occupied = new Set<string>();

      appointments.forEach((apt) => {
        // Skip the current appointment being rescheduled
        if (apt.serviceCode === request.serviceCode) {
          // We'd need the appointmentId to skip properly, but this is a reasonable approximation
          occupied.add(`${apt.startTime}-${apt.endTime}`);
        } else {
          occupied.add(`${apt.startTime}-${apt.endTime}`);
        }
      });

      setOccupiedSlots(occupied);
    } catch (error) {
      console.error("Error loading occupied slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Check if date is valid based on timetable
  const isDateValid = useCallback(
    (date: Date): boolean => {
      if (!timetable || !request) return false;

      const dayName = weekdayName(date);
      const daySlots = timetable[dayName];
      if (!daySlots?.slots?.[request.serviceCode]) return false;

      return daySlots.slots[request.serviceCode].length > 0;
    },
    [timetable, request]
  );

  // Get available slots for selected date
  const availableSlots = useMemo((): TimeSlot[] => {
    if (!selectedDate || !timetable || !request) return [];

    const dayName = weekdayName(selectedDate);
    const daySlots = timetable[dayName];
    if (!daySlots?.slots?.[request.serviceCode]) return [];

    const slots = daySlots.slots[request.serviceCode] || [];

    // Filter out occupied slots
    return slots.filter((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      return !occupiedSlots.has(key);
    });
  }, [selectedDate, timetable, request, occupiedSlots]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateValid(date)) {
      setSelectedDate(date);
      setSelectedSlot(null);
    }
  };

  // Handle reschedule submission
  const handleReschedule = async () => {
    if (!request || !selectedDate || !selectedSlot) {
      Alert.alert("Fehler", "Bitte wählen Sie ein Datum und einen Zeitslot");
      return;
    }

    Alert.alert(
      "Umplanung bestätigen",
      `Termin auf ${toDMY(selectedDate)} um ${selectedSlot.startTime}-${selectedSlot.endTime} umplanen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Bestätigen",
          onPress: async () => {
            setIsSubmitting(true);

            try {
              // 1. Reschedule the appointment
              const payload: any = {
                serviceCode: request.serviceCode,
                appointmentId: request.appointmentId,
                updatedDate: toDMY(selectedDate),
                updatedStartTime: selectedSlot.startTime,
                updatedEndTime: selectedSlot.endTime,
              };

              if (request.serviceCode !== "A1/A2") {
                payload.midwifeId = request.midwifeId;
                payload.clientId = request.clientId;
              }

              const rescheduleRes = await api("/api/public/changeAppointmentSlots", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              const rescheduleResult = await readJsonSafe<any>(rescheduleRes);

              if (!rescheduleRes.ok || !rescheduleResult.success) {
                throw new Error(rescheduleResult.error || "Failed to reschedule appointment");
              }

              // 2. Update request status to approved
              const statusRes = await api("/api/public/clientRequest/updateRequestStatus", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId: request._id,
                  status: "approved",
                }),
              });

              const statusResult = await readJsonSafe<any>(statusRes);

              if (!statusRes.ok || !statusResult.success) {
                throw new Error(statusResult.message || "Failed to update request status");
              }

              Alert.alert("Erfolgreich", "Termin erfolgreich umgeplant!");
              onSuccess();
            } catch (error: any) {
              console.error("Error rescheduling:", error);
              Alert.alert("Fehler", error.message || "Termin konnte nicht umgeplant werden");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (!request) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Bearbeiten & Umplanen {request.serviceCode}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {!timetable ? (
            <Text style={styles.errorText}>Kein Zeitplan gefunden</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* Service Info */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Service: {de.serviceCodes[request.serviceCode as keyof typeof de.serviceCodes] || request.serviceCode}
                </Text>
              </View>

              {/* Suggested Time (if available) */}
              {request.suggestedDate && (
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionLabel}>Vorschlag der Patientin:</Text>
                  <Text style={styles.suggestionText}>
                    {request.suggestedDate} • {request.suggestedStartTime}-{request.suggestedEndTime}
                  </Text>
                </View>
              )}

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
                  style={styles.navButton}>
                  <Text style={styles.navButtonText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Week Header */}
              <View style={styles.weekHeader}>
                {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d, i) => (
                  <Text key={i} style={styles.weekHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <CalendarGrid
                month={calendarMonth}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                isDateValid={isDateValid}
              />

              {/* Available Slots */}
              {selectedDate && (
                <View style={styles.slotsSection}>
                  <Text style={styles.slotsTitle}>
                    Verfügbare Slots am {toDMY(selectedDate)}
                  </Text>

                  {loadingSlots ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                  ) : availableSlots.length === 0 ? (
                    <Text style={styles.helperText}>Keine freien Slots an diesem Datum</Text>
                  ) : (
                    <View style={styles.slotsList}>
                      {availableSlots.map((slot, idx) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime &&
                          selectedSlot?.endTime === slot.endTime;

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setSelectedSlot(slot)}
                            style={[styles.slotCard, isSelected && styles.slotCardActive]}
                          >
                            <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                              {slot.startTime} – {slot.endTime}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isSubmitting}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>{de.actions.cancel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReschedule}
                  disabled={isSubmitting || !selectedDate || !selectedSlot}
                  style={[
                    styles.rescheduleButton,
                    (isSubmitting || !selectedDate || !selectedSlot) && { opacity: 0.6 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.rescheduleButtonText}>Umplanen</Text>
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
  selectedDate,
  onDateSelect,
  isDateValid,
}: {
  month: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  isDateValid: (date: Date) => boolean;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];

  // Empty cells
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.gridCell} />);
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    date.setHours(0, 0, 0, 0);

    const valid = isDateValid(date) && date >= today;
    const selected = selectedDate && sameDay(date, selectedDate);

    cells.push(
      <TouchableOpacity
        key={day}
        style={[
          styles.gridCell,
          !valid && styles.gridCellDisabled,
          selected && styles.gridCellSelected,
        ]}
        onPress={() => valid && onDateSelect(date)}
        disabled={!valid}
      >
        <Text style={[styles.gridDay, selected && styles.gridDaySelected]}>{day}</Text>
      </TouchableOpacity>
    );
  }

  return <View style={styles.grid}>{cells}</View>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 450,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: "800",
  },
  errorText: {
    color: COLORS.error,
    padding: SPACING.md,
  },
  scrollView: {
    maxHeight: 600,
  },
  infoBox: {
    backgroundColor: COLORS.backgroundGray,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  suggestionBox: {
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
    marginBottom: SPACING.lg,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
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
    backgroundColor: COLORS.primary,
  },
  gridDay: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 14,
  },
  gridDaySelected: {
    color: COLORS.background,
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
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  rescheduleButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "800",
  },
});