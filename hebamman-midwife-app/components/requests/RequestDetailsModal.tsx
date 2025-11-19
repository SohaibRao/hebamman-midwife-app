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

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  line: "#E5E7EB",
};

const SERVICE_NAMES: Record<string, string> = {
  "A1": "Initial Consultation A1",
  "A1/A2": "Initial Consultation",
  "B1": "Pre Birth Visit",
  "B2": "Pre Birth Video",
  "E1": "Birth Training",
  "C1": "Early Care Visit",
  "C2": "Early Care Video",
  "D1": "Late Care Visit",
  "D2": "Late Care Video",
  "F1": "After Birth Gym",
};

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
    return date.toLocaleDateString(undefined, {
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
  return type === "edit" ? "Reschedule" : "Cancellation";
};

export default function RequestDetailsModal({
  visible,
  request,
  onClose,
  onRescheduleEdit,
  onRequestUpdated,
  getClientName,
  midwifeId,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!request) return null;

  const isPending = request.status === "pending";
  const isReschedule = request.requestType === "edit";

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
        "Success",
        `Request ${status === "approved" ? "approved" : "rejected"} successfully`
      );

      onClose();
      onRequestUpdated();
    } catch (error: any) {
      console.error("Error updating request status:", error);
      Alert.alert("Error", error.message || "Failed to update request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel approval
  const handleApproveCancellation = async () => {
    Alert.alert(
      "Approve Cancellation",
      "Are you sure you want to approve this cancellation request? This will cancel the appointment.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
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
              Alert.alert("Error", error.message || "Failed to approve cancellation");
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Handle reschedule approval (with suggested date/time)
  const handleApproveReschedule = async () => {
    if (!request.suggestedDate || !request.suggestedStartTime || !request.suggestedEndTime) {
      Alert.alert("Error", "No suggested date/time provided");
      return;
    }

    Alert.alert(
      "Approve Reschedule",
      `Approve rescheduling to ${request.suggestedDate} at ${request.suggestedStartTime}-${request.suggestedEndTime}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
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
              Alert.alert("Error", error.message || "Failed to approve reschedule");
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Handle reject
  const handleReject = () => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
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
            <Text style={styles.modalTitle}>Request Details</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Request Type Badge */}
            <View style={styles.requestTypeBadge}>
              <Text style={styles.requestTypeBadgeText}>
                {getRequestTypeLabel(request.requestType)} Request
              </Text>
            </View>

            {/* Status Badge */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadgeLarge,
                  {
                    backgroundColor:
                      request.status === "pending"
                        ? "#FEF3C7"
                        : request.status === "approved"
                        ? "#D1FAE5"
                        : "#FEE2E2",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeLargeText,
                    {
                      color:
                        request.status === "pending"
                          ? "#92400E"
                          : request.status === "approved"
                          ? "#065F46"
                          : "#991B1B",
                    },
                  ]}
                >
                  {request.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Patient & Service Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Appointment Information</Text>
              <DetailRow label="Patient" value={getClientName(request.clientId)} />
              <DetailRow
                label="Service"
                value={`${request.serviceCode} - ${SERVICE_NAMES[request.serviceCode] || request.serviceCode}`}
              />
            </View>

            {/* Suggested Date/Time (for reschedule) */}
            {isReschedule && request.suggestedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Suggested New Schedule</Text>
                <View style={styles.suggestionBox}>
                  <DetailRow label="Date" value={request.suggestedDate} />
                  <DetailRow
                    label="Time"
                    value={`${request.suggestedStartTime} - ${request.suggestedEndTime}`}
                  />
                </View>
              </View>
            )}

            {/* Note */}
            {request.note && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Patient's Note</Text>
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{request.note}</Text>
                </View>
              </View>
            )}

            {/* Timestamps */}
            <View style={styles.section}>
              <DetailRow label="Requested on" value={formatDateTime(request.createdAt)} />
              {request.updatedAt !== request.createdAt && (
                <DetailRow label="Last updated" value={formatDateTime(request.updatedAt)} />
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
                        <Text style={styles.approveButtonText}>✓ Approve Suggested Time</Text>
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
                      <Text style={styles.editButtonText}>✎ Edit & Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleReject}
                      disabled={isProcessing}
                      style={[styles.rejectButton, isProcessing && { opacity: 0.6 }]}
                    >
                      <Text style={styles.rejectButtonText}>✕ Reject Request</Text>
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
                        <Text style={styles.approveButtonText}>✓ Approve & Cancel Appointment</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleReject}
                      disabled={isProcessing}
                      style={[styles.rejectButton, isProcessing && { opacity: 0.6 }]}
                    >
                      <Text style={styles.rejectButtonText}>✕ Reject Request</Text>
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
                <Text style={styles.closeModalButtonText}>Close</Text>
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
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.dim,
    fontWeight: "800",
  },
  requestTypeBadge: {
    backgroundColor: COLORS.blue + "20",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  requestTypeBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.blue,
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeLargeText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dim,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  suggestionBox: {
    backgroundColor: "#F0F9FF",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
  },
  noteBox: {
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: 8,
    gap: 10,
  },
  approveButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  approveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  editButton: {
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  rejectButton: {
    backgroundColor: COLORS.red,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  closeModalButton: {
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});