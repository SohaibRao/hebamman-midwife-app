// components/appointments/CancelConfirmModal.tsx
import React from "react";
import {
  ActivityIndicator,
  Modal,
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
  duration: number;
  clientId?: string;
};

type Props = {
  visible: boolean;
  appointment: UiApt | null;
  isCanceling: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  getPatientName: (clientId?: string) => string;
};

export default function CancelConfirmModal({
  visible,
  appointment,
  isCanceling,
  onConfirm,
  onCancel,
  getPatientName,
}: Props) {
  if (!appointment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{de.appointments.cancelAppointment}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.question}>
              {de.appointments.confirmCancel}
            </Text>

            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentTitle}>
                {appointment.serviceCode}
              </Text>
              <Text style={styles.appointmentDetail}>
                {de.appointments.patientName}: {getPatientName(appointment.clientId)}
              </Text>
              <Text style={styles.appointmentDetail}>
                {de.common.date}: {appointment.appointmentDate}
              </Text>
              <Text style={styles.appointmentDetail}>
                {de.common.time}: {appointment.startTime} - {appointment.endTime}
              </Text>
              <Text style={styles.appointmentDetail}>
                {de.appointments.duration}: {appointment.duration} {de.appointments.minutes}
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ Diese Aktion kann nicht rückgängig gemacht werden</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isCanceling}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{de.actions.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isCanceling}
              style={[styles.cancelButton, isCanceling && { opacity: 0.6 }]}
            >
              {isCanceling ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.cancelButtonText}>Ja, absagen</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  content: {
    paddingVertical: SPACING.md,
  },
  question: {
    color: COLORS.text,
    marginBottom: SPACING.lg,
    fontSize: 15,
  },
  appointmentInfo: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  appointmentDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  warningBox: {
    backgroundColor: COLORS.warningLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.warningDark,
    fontWeight: "600",
    textAlign: "center",
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
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "800",
  },
});