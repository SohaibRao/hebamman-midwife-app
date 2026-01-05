// components/appointments/AppointmentDetailsModal.tsx
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

type Props = {
  visible: boolean;
  appointment: UiApt | null;
  onClose: () => void;
  onEdit: (apt: UiApt) => void;
  onCancel: (apt: UiApt) => void;
  onReactivate: (apt: UiApt) => void;
  getPatientName: (clientId?: string) => string;
};

export default function AppointmentDetailsModal({
  visible,
  appointment,
  onClose,
  onEdit,
  onCancel,
  onReactivate,
  getPatientName,
}: Props) {
  if (!appointment) return null;

  const isCancelled = appointment.status?.toLowerCase() === "cancelled";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{de.appointments.appointmentDetails}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <DetailRow label={de.appointments.patientName} value={getPatientName(appointment.clientId)} />
          <DetailRow label={de.appointments.serviceCode} value={appointment.serviceCode} />
          <DetailRow label={de.common.date} value={appointment.appointmentDate} />
          <DetailRow
            label={de.common.time}
            value={`${appointment.startTime}–${appointment.endTime}`}
          />
          <DetailRow label={de.appointments.duration} value={`${appointment.duration} ${de.appointments.minutes}`} />
          <DetailRow label={de.common.status} value={appointment.status ?? "—"} />

          {isCancelled ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onReactivate(appointment);
                }}
                style={[styles.primaryButton, styles.reactivateButton]}
              >
                <Text style={styles.primaryButtonText}>{de.appointments.reactivateAppointment}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{de.actions.close}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onEdit(appointment);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{de.actions.edit}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onCancel(appointment);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>{de.actions.cancel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value ?? "—"}</Text>
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
  detailRow: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  detailLabel: {
    width: 110,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  detailValue: {
    flex: 1,
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.background,
    fontWeight: "800",
  },
  reactivateButton: {
    backgroundColor: COLORS.success,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.background,
    fontWeight: "800",
  },
});