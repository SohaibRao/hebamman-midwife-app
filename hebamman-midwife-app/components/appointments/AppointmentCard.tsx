// components/appointments/AppointmentCard.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
};

const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": "#7c3aed",
  B1: "#2563eb",
  B2: "#0ea5e9",
  E1: "#f59e0b",
  C1: "#16a34a",
  C2: "#10b981",
  D1: "#ef4444",
  D2: "#f97316",
  F1: "#a855f7",
};

const getStatusBadgeStyle = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || "active";
  const styles: Record<string, any> = {
    active: {
      backgroundColor: "#D1FAE5",
      color: "#065F46",
    },
    pending: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    },
    cancelled: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
    },
  };
  return styles[normalizedStatus] || styles.active;
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
  const codeColor = SERVICE_COLORS[appointment.serviceCode] ?? COLORS.sage;
  const isCancelled = appointment.status?.toLowerCase() === "cancelled";
  const statusStyle = getStatusBadgeStyle(appointment.status);

  const dateStr = appointment.dateObj.toLocaleDateString(undefined, {
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
              {(appointment.status || "active").toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {dateStr} • {appointment.startTime}–{appointment.endTime} •{" "}
          {appointment.duration}m
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onPressDetails} style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
        {!isCancelled && (
          <TouchableOpacity onPress={onPressEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
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
    paddingVertical: 12,
    gap: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.dim,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  actions: {
    gap: 8,
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  detailsButtonText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  editButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
});