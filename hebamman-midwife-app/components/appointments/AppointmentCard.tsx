// components/appointments/AppointmentCard.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": COLORS.serviceA1A2,
  B1: COLORS.serviceB1,
  B2: COLORS.serviceB2,
  E1: COLORS.serviceE1,
  C1: COLORS.serviceC1,
  C2: COLORS.serviceC2,
  D1: COLORS.serviceD1,
  D2: COLORS.serviceD2,
  F1: COLORS.serviceF1,
};

const getStatusBadgeStyle = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || "active";
  const styles: Record<string, any> = {
    active: {
      backgroundColor: COLORS.successLight,
      color: COLORS.success,
    },
    pending: {
      backgroundColor: COLORS.warningLight,
      color: COLORS.warning,
    },
    cancelled: {
      backgroundColor: COLORS.errorLight,
      color: COLORS.error,
    },
  };
  return styles[normalizedStatus] || styles.active;
};

const getStatusLabel = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || "active";
  if (normalizedStatus === "active") return de.appointments.status.active;
  if (normalizedStatus === "pending") return de.appointments.status.pending;
  if (normalizedStatus === "cancelled") return de.appointments.status.cancelled;
  return status?.toUpperCase() || "ACTIVE";
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
};

type Props = {
  appointment: UiApt;
  patientName: string;
  onPressDetails: () => void;
  onPressEdit: () => void;
};

export default function AppointmentCard({
  appointment,
  patientName,
  onPressDetails,
  onPressEdit,
}: Props) {
  const codeColor = SERVICE_COLORS[appointment.serviceCode] ?? COLORS.textSecondary;
  const isCancelled = appointment.status?.toLowerCase() === "cancelled";
  const statusStyle = getStatusBadgeStyle(appointment.status);

  const dateStr = appointment.dateObj.toLocaleDateString('de-DE', {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: codeColor }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {appointment.serviceCode} • {patientName}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
              {getStatusLabel(appointment.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {dateStr} • {appointment.startTime}–{appointment.endTime} •{" "}
          {appointment.duration}{de.appointments.minutes}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onPressDetails} style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>{de.actions.viewDetails}</Text>
        </TouchableOpacity>
        {!isCancelled && (
          <TouchableOpacity onPress={onPressEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>{de.actions.edit}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 4,
  },
  title: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: 15,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  actions: {
    gap: SPACING.sm,
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "transparent",
  },
  detailsButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  editButtonText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: 12,
  },
});