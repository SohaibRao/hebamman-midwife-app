// components/appointments/AppointmentCard.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, BORDER_RADIUS, LOCATION_COLORS } from "@/constants/theme";
import de from "@/constants/i18n";

// Service type map - currently displaying codes as-is
// Will be updated with exact naming in the future
const SERVICE_TYPE_MAP: Record<string, string> = {
  "A1/A2": "A1/A2",
  B1: "B1",
  B2: "B2",
  E1: "E1",
  C1: "C1",
  C2: "C2",
  D1: "D1",
  D2: "D2",
  F1: "F1",
};

// Map service codes to location types
const SERVICE_LOCATION_MAP: Record<string, string> = {
  "A1/A2": "In persona/ In Video",
  B1: "In persona",
  B2: "In Video",
  E1: "In persona",
  C1: "In persona",
  C2: "In Video",
  D1: "In persona",
  D2: "In Video",
  F1: "In persona",
};

const getLocationBadge = (serviceCode: string) => {
  const locationLabel = SERVICE_LOCATION_MAP[serviceCode] || "In persona";

  // Determine badge color based on location type
  let backgroundColor: string;
  let textColor: string;
  let icon: keyof typeof Ionicons.glyphMap;

  if (locationLabel.includes("In persona") && locationLabel.includes("In Video")) {
    // A1/A2 - Both options (use purple for hybrid)
    backgroundColor = COLORS.locationVideocall;
    textColor = COLORS.locationVideocallText;
    icon = "people";
  } else if (locationLabel === "In persona") {
    // In person (use green)
    backgroundColor = COLORS.locationHausbesuch;
    textColor = COLORS.locationHausbesuchText;
    icon = "person";
  } else if (locationLabel === "In Video") {
    // Video (use blue)
    backgroundColor = COLORS.locationPraxis;
    textColor = COLORS.locationPraxisText;
    icon = "videocam";
  } else {
    // Default
    backgroundColor = COLORS.locationPraxis;
    textColor = COLORS.locationPraxisText;
    icon = "help-circle";
  }

  return {
    label: locationLabel,
    icon,
    backgroundColor,
    textColor,
  };
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
  const locationBadge = getLocationBadge(appointment.serviceCode);
  const appointmentType = SERVICE_TYPE_MAP[appointment.serviceCode] || appointment.serviceCode;
  const isCancelled = appointment.status?.toLowerCase() === "cancelled";

  return (
    <TouchableOpacity
      style={[styles.card, isCancelled && styles.cardCancelled]}
      onPress={onPressDetails}
      activeOpacity={0.7}
    >
      {/* Time on the left */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{appointment.startTime}</Text>
      </View>

      {/* Patient info and appointment type */}
      <View style={styles.infoContainer}>
        <View style={styles.patientRow}>
          <Ionicons name="person" size={16} color={COLORS.textSecondary} />
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        <Text style={styles.appointmentType}>{appointmentType}</Text>
      </View>

      {/* Location badge on the right */}
      <View
        style={[
          styles.locationBadge,
          { backgroundColor: locationBadge.backgroundColor }
        ]}
      >
        <Ionicons
          name={locationBadge.icon}
          size={14}
          color={locationBadge.textColor}
        />
        <Text style={[styles.locationText, { color: locationBadge.textColor }]}>
          {locationBadge.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardCancelled: {
    opacity: 0.6,
  },
  timeContainer: {
    marginRight: SPACING.lg,
  },
  timeText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  appointmentType: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: "600",
  },
});