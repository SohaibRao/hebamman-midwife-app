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

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  line: "#E5E7EB",
};

const SERVICE_NAMES: Record<string, string> = {
  "A1/A2": "Initial Consultation",
  B1: "Pre Birth Visit",
  B2: "Pre Birth Video",
  E1: "Birth Training",
  C1: "Early Care Visit",
  C2: "Early Care Video",
  D1: "Late Care Visit",
  D2: "Late Care Video",
  F1: "After Birth Gym",
};

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
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.question}>
              Are you sure you want to cancel this appointment?
            </Text>

            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentTitle}>
                {SERVICE_NAMES[appointment.serviceCode] || appointment.serviceCode}
              </Text>
              <Text style={styles.appointmentDetail}>
                Patient: {getPatientName(appointment.clientId)}
              </Text>
              <Text style={styles.appointmentDetail}>
                Date: {appointment.appointmentDate}
              </Text>
              <Text style={styles.appointmentDetail}>
                Time: {appointment.startTime} - {appointment.endTime}
              </Text>
              <Text style={styles.appointmentDetail}>
                Duration: {appointment.duration} minutes
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ This action cannot be undone</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isCanceling}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isCanceling}
              style={[styles.cancelButton, isCanceling && { opacity: 0.6 }]}
            >
              {isCanceling ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.cancelButtonText}>Yes, Cancel It</Text>
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
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  content: {
    paddingVertical: 12,
  },
  question: {
    color: COLORS.text,
    marginBottom: 16,
    fontSize: 15,
  },
  appointmentInfo: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  appointmentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  appointmentDetail: {
    fontSize: 14,
    color: COLORS.dim,
    marginBottom: 6,
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontWeight: "800",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});