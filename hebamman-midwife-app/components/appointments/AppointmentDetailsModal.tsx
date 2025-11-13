// components/appointments/AppointmentDetailsModal.tsx
import React from "react";
import {
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
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <DetailRow label="Patient" value={getPatientName(appointment.clientId)} />
          <DetailRow label="Service" value={appointment.serviceCode} />
          <DetailRow label="Date" value={appointment.appointmentDate} />
          <DetailRow
            label="Time"
            value={`${appointment.startTime}–${appointment.endTime}`}
          />
          <DetailRow label="Duration" value={`${appointment.duration} min`} />
          <DetailRow label="Status" value={appointment.status ?? "—"} />

          {isCancelled ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onReactivate(appointment);
                }}
                style={[styles.primaryButton, styles.reactivateButton]}
              >
                <Text style={styles.primaryButtonText}>Reactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Close</Text>
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
                <Text style={styles.primaryButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onCancel(appointment);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  closeButton: {
    fontWeight: "800",
    color: COLORS.dim,
    fontSize: 18,
  },
  detailRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  detailLabel: {
    width: 110,
    color: COLORS.dim,
    fontWeight: "700",
  },
  detailValue: {
    flex: 1,
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "800",
  },
  reactivateButton: {
    backgroundColor: "#16a34a",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "800",
  },
});