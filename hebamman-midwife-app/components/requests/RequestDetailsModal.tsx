// components/requests/RequestDetailsModal.tsx
import React, { useState } from "react";
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

type RequestType = "edit" | "cancelled";
type RequestStatus = "pending" | "approved" | "rejected";

type Request = {
  _id: string;
  requestType: RequestType;
  midwifeId: string;
  clientId: string;
  serviceCode: string;
  appointmentId: string;
  suggestedDate: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  note: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

type Timetable = {
  [weekday: string]: {
    slots: {
      [serviceCode: string]: { startTime: string; endTime: string }[];
    };
  };
};

type Props = {
  visible: boolean;
  request: Request | null;
  onClose: () => void;
  onRescheduleEdit: (request: Request) => void;
  onRequestUpdated: () => void;
  getClientName: (clientId: string) => string;
  midwifeId: string;
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

const formatDateTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const getRequestTypeLabel = (type: RequestType) => {
  return type === "edit" ? de.requests.types.reschedule : de.requests.types.cancellation;
};

// Helper functions
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

const weekdayName = (d: Date) => {
  const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return days[d.getDay()];
};

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
): Promise<Array<{ startTime: string; endTime: string; serviceCode: string; appointmentId: string }>> {
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
    const appointments: Array<{ startTime: string; endTime: string; serviceCode: string; appointmentId: string }> = [];

    // Extract all appointments for this date
    Object.keys(bucket).forEach((serviceCode) => {
      const apts = bucket[serviceCode] || [];
      apts.forEach((apt: any) => {
        if (apt.appointmentDate === dateKey) {
          appointments.push({
            startTime: apt.startTime,
            endTime: apt.endTime,
            serviceCode,
            appointmentId: apt.appointmentId || "",
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

export default function RequestDetailsModal({
  visible,
  request,
  onClose,
  onRescheduleEdit,
  onRequestUpdated,
  getClientName,
  midwifeId,
}: Props) {
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = pf.data as any;
  const timetable: Timetable | undefined = midwifeProfile?.identity?.timetable;

  const [isProcessing, setIsProcessing] = useState(false);

  if (!request) return null;

  const isPending = request.status === "pending";
  const isReschedule = request.requestType === "edit";

  // Validate if suggested time is available in midwife's timetable
  const validateSuggestedTime = async (): Promise<{ valid: boolean; message?: string }> => {
    if (!request.suggestedDate || !request.suggestedStartTime || !request.suggestedEndTime) {
      return { valid: false, message: "Kein vorgeschlagenes Datum/Uhrzeit angegeben" };
    }

    // Refresh midwife profile to get latest timetable
    await pf.refresh();
    const latestTimetable: Timetable | undefined = pf.data?.identity?.timetable;

    if (!latestTimetable) {
      return { valid: false, message: "Zugriff auf den Zeitplan der Hebamme nicht möglich" };
    }

    // Parse the suggested date
    const suggestedDate = parseDMY(request.suggestedDate);
    if (!suggestedDate) {
      return { valid: false, message: "Ungültiges Datumsformat" };
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (suggestedDate < today) {
      return { valid: false, message: "Termine können nicht in der Vergangenheit geplant werden" };
    }

    // Get day of week
    const dayName = weekdayName(suggestedDate);
    const daySlots = latestTimetable[dayName];

    // Check if midwife works on this day for this service
    if (!daySlots?.slots?.[request.serviceCode]) {
      return {
        valid: false,
        message: `Die Hebamme ist nicht verfügbar für ${de.serviceCodes[request.serviceCode as keyof typeof de.serviceCodes] || request.serviceCode} an ${dayName}en`,
      };
    }

    const availableSlots = daySlots.slots[request.serviceCode] || [];

    // Check if the suggested time matches any of the timetable slots
    const matchingSlot = availableSlots.find(
      (slot) =>
        slot.startTime === request.suggestedStartTime &&
        slot.endTime === request.suggestedEndTime
    );

    if (!matchingSlot) {
      return {
        valid: false,
        message: `Die vorgeschlagene Zeit ${request.suggestedStartTime}-${request.suggestedEndTime} ist nicht im verfügbaren Zeitplan der Hebamme für diesen Service`,
      };
    }

    // Fetch current appointments for this date to check for conflicts
    try {
      const existingAppointments = await fetchAppointmentsForDate(midwifeId, suggestedDate);

      // Check if the slot is already occupied (excluding the current appointment being rescheduled)
      const isOccupied = existingAppointments.some(
        (apt) =>
          apt.startTime === request.suggestedStartTime &&
          apt.endTime === request.suggestedEndTime &&
          apt.appointmentId !== request.appointmentId // Don't count the appointment being rescheduled
      );

      if (isOccupied) {
        return {
          valid: false,
          message: "Dieser Zeitslot ist bereits mit einem anderen Termin gebucht",
        };
      }
    } catch (error) {
      console.error("Error checking appointment conflicts:", error);
      return {
        valid: false,
        message: "Terminverfügbarkeit kann nicht überprüft werden. Bitte versuchen Sie es erneut.",
      };
    }

    return { valid: true };
  };

  // Update request status
  const updateRequestStatus = async (status: "approved" | "rejected") => {
    setIsProcessing(true);

    try {
      const res = await api("/api/public/clientRequest/updateRequestStatus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request._id,
          status,
        }),
      });

      const result = await readJsonSafe<any>(res);

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to update request");
      }

      Alert.alert(
        "Erfolgreich",
        `Anfrage erfolgreich ${status === "approved" ? "genehmigt" : "abgelehnt"}`
      );

      onClose();
      onRequestUpdated();
    } catch (error: any) {
      console.error("Error updating request status:", error);
      Alert.alert("Fehler", error.message || "Anfrage konnte nicht aktualisiert werden");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel approval
  const handleApproveCancellation = async () => {
    Alert.alert(
      "Stornierung genehmigen",
      "Möchten Sie diese Stornierungsanfrage wirklich genehmigen? Dies wird den Termin absagen.",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Genehmigen",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);

            try {
              // First, cancel the appointment
              const body: any = {
                appointmentId: request.appointmentId,
                serviceCode: request.serviceCode,
              };

              // Add midwifeId and clientId for non-A1/A2 services
              if (request.serviceCode !== "A1/A2") {
                body.midwifeId = request.midwifeId;
                body.clientId = request.clientId;
              }

              const cancelRes = await api("/api/public/cancelAppointment", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });

              const cancelResult = await readJsonSafe<any>(cancelRes);

              if (!cancelRes.ok || !cancelResult.success) {
                throw new Error(cancelResult.error || "Failed to cancel appointment");
              }

              // Then update request status
              await updateRequestStatus("approved");
            } catch (error: any) {
              console.error("Error approving cancellation:", error);
              Alert.alert("Fehler", error.message || "Stornierung konnte nicht genehmigt werden");
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Handle reschedule approval (with validation of suggested date/time)
  const handleApproveReschedule = async () => {
    if (!request.suggestedDate || !request.suggestedStartTime || !request.suggestedEndTime) {
      Alert.alert("Fehler", "Kein vorgeschlagenes Datum/Uhrzeit angegeben");
      return;
    }

    setIsProcessing(true);

    try {
      // Validate the suggested time against current timetable
      const validation = await validateSuggestedTime();

      if (!validation.valid) {
        setIsProcessing(false);
        Alert.alert("Zeit nicht verfügbar", validation.message || "Die vorgeschlagene Zeit ist nicht verfügbar");
        return;
      }

      // If validation passes, proceed with confirmation
      setIsProcessing(false);

      Alert.alert(
        "Umplanung genehmigen",
        `Umplanung auf ${request.suggestedDate} um ${request.suggestedStartTime}-${request.suggestedEndTime} genehmigen?`,
        [
          {
            text: "Abbrechen",
            style: "cancel",
          },
          {
            text: "Genehmigen",
            onPress: async () => {
              setIsProcessing(true);

              try {
                // Reschedule the appointment
                const payload: any = {
                  serviceCode: request.serviceCode,
                  appointmentId: request.appointmentId,
                  updatedDate: request.suggestedDate,
                  updatedStartTime: request.suggestedStartTime,
                  updatedEndTime: request.suggestedEndTime,
                };

                if (request.serviceCode !== "A1/A2") {
                  payload.midwifeId = request.midwifeId;
                  payload.clientId = request.clientId;
                }

                const res = await api("/api/public/changeAppointmentSlots", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const result = await readJsonSafe<any>(res);

                if (!res.ok || !result.success) {
                  throw new Error(result.error || "Failed to reschedule appointment");
                }

                // Update request status
                await updateRequestStatus("approved");
              } catch (error: any) {
                console.error("Error approving reschedule:", error);
                Alert.alert("Fehler", error.message || "Umplanung konnte nicht genehmigt werden");
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error validating time:", error);
      Alert.alert("Fehler", "Vorgeschlagene Zeit konnte nicht validiert werden. Bitte versuchen Sie es erneut.");
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = () => {
    Alert.alert(
      "Anfrage ablehnen",
      "Möchten Sie diese Anfrage wirklich ablehnen?",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Ablehnen",
          style: "destructive",
          onPress: () => updateRequestStatus("rejected"),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Anfragedetails</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Request Type Badge */}
            <View style={styles.requestTypeBadge}>
              <Text style={styles.requestTypeBadgeText}>
                {getRequestTypeLabel(request.requestType)} Anfrage
              </Text>
            </View>

            {/* Status Badge */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>{de.common.status}</Text>
              <View
                style={[
                  styles.statusBadgeLarge,
                  {
                    backgroundColor:
                      request.status === "pending"
                        ? COLORS.warningLight
                        : request.status === "approved"
                        ? COLORS.successLight
                        : COLORS.errorLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeLargeText,
                    {
                      color:
                        request.status === "pending"
                          ? COLORS.warningDark
                          : request.status === "approved"
                          ? COLORS.successDark
                          : COLORS.errorDark,
                    },
                  ]}
                >
                  {(request.status === "pending" ? de.requests.status.pending :
                    request.status === "approved" ? de.requests.status.approved :
                    de.requests.status.rejected).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Patient & Service Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Termindetails</Text>
              <DetailRow label="Patientin" value={getClientName(request.clientId)} />
              <DetailRow
                label={de.appointments.serviceCode}
                value={`${request.serviceCode} - ${de.serviceCodes[request.serviceCode as keyof typeof de.serviceCodes] || request.serviceCode}`}
              />
            </View>

            {/* Suggested Date/Time (for reschedule) */}
            {isReschedule && request.suggestedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Vorgeschlagener neuer Zeitplan</Text>
                <View style={styles.suggestionBox}>
                  <DetailRow label={de.common.date} value={request.suggestedDate} />
                  <DetailRow
                    label={de.common.time}
                    value={`${request.suggestedStartTime} - ${request.suggestedEndTime}`}
                  />
                </View>
              </View>
            )}

            {/* Note */}
            {request.note && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Notiz der Patientin</Text>
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{request.note}</Text>
                </View>
              </View>
            )}

            {/* Timestamps */}
            <View style={styles.section}>
              <DetailRow label="Angefordert am" value={formatDateTime(request.createdAt)} />
              {request.updatedAt !== request.createdAt && (
                <DetailRow label="Zuletzt aktualisiert" value={formatDateTime(request.updatedAt)} />
              )}
            </View>

            {/* Action Buttons */}
            {isPending && (
              <View style={styles.actionSection}>
                {isReschedule ? (
                  <>
                    {/* Reschedule Actions */}
                    <TouchableOpacity
                      onPress={handleApproveReschedule}
                      disabled={isProcessing}
                      style={[styles.approveButton, isProcessing && { opacity: 0.6 }]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.approveButtonText}>✓ Vorgeschlagene Zeit genehmigen</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        onRescheduleEdit(request);
                      }}
                      disabled={isProcessing}
                      style={[styles.editButton, isProcessing && { opacity: 0.6 }]}
                    >
                      <Text style={styles.editButtonText}>✎ Bearbeiten & Umplanen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleReject}
                      disabled={isProcessing}
                      style={[styles.rejectButton, isProcessing && { opacity: 0.6 }]}
                    >
                      <Text style={styles.rejectButtonText}>✕ Anfrage ablehnen</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Cancellation Actions */}
                    <TouchableOpacity
                      onPress={handleApproveCancellation}
                      disabled={isProcessing}
                      style={[styles.approveButton, isProcessing && { opacity: 0.6 }]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.approveButtonText}>✓ Genehmigen & Termin absagen</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleReject}
                      disabled={isProcessing}
                      style={[styles.rejectButton, isProcessing && { opacity: 0.6 }]}
                    >
                      <Text style={styles.rejectButtonText}>✕ Anfrage ablehnen</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          {!isPending && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
                <Text style={styles.closeModalButtonText}>{de.actions.close}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
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
    maxWidth: 500,
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
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: "800",
  },
  requestTypeBadge: {
    backgroundColor: COLORS.info + "20",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
    marginBottom: SPACING.lg,
  },
  requestTypeBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.info,
  },
  statusSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  statusBadgeLarge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  statusBadgeLargeText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  section: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  suggestionBox: {
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  noteBox: {
    backgroundColor: COLORS.backgroundGray,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  approveButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  approveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  editButton: {
    backgroundColor: COLORS.info,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  editButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  rejectButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  rejectButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  closeModalButton: {
    backgroundColor: COLORS.backgroundGray,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});