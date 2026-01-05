// components/requests/RequestCard.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

type RequestType = "edit" | "cancelled";
type RequestStatus = "pending" | "approved" | "rejected";

type Request = {
  _id: string;
  requestType: RequestType;
  serviceCode: string;
  suggestedDate: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  note: string;
  status: RequestStatus;
  createdAt: string;
};

type Props = {
  request: Request;
  clientName: string;
  onPress: () => void;
};

const getRequestTypeLabel = (type: RequestType) => {
  return type === "edit" ? de.requests.types.reschedule : de.requests.types.cancellation;
};

const getRequestTypeColor = (type: RequestType) => {
  return type === "edit" ? COLORS.info : COLORS.error;
};

const getStatusBadgeStyle = (status: RequestStatus) => {
  const styles: Record<RequestStatus, any> = {
    pending: {
      backgroundColor: COLORS.warningLight,
      color: COLORS.warningDark,
    },
    approved: {
      backgroundColor: COLORS.successLight,
      color: COLORS.successDark,
    },
    rejected: {
      backgroundColor: COLORS.errorLight,
      color: COLORS.errorDark,
    },
  };
  return styles[status];
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
};

export default function RequestCard({ request, clientName, onPress }: Props) {
  const serviceColor = COLORS[`service${request.serviceCode.replace('/', '')}` as keyof typeof COLORS] ?? COLORS.textSecondary;
  const statusStyle = getStatusBadgeStyle(request.status);

  const statusLabel = request.status === 'pending' ? de.requests.status.pending :
                      request.status === 'approved' ? de.requests.status.approved :
                      de.requests.status.rejected;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      {/* Color indicator */}
      <View style={[styles.colorBar, { backgroundColor: serviceColor }]} />

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{clientName}</Text>
            <View style={styles.serviceRow}>
              <View style={[styles.serviceDot, { backgroundColor: serviceColor }]} />
              <Text style={styles.serviceText}>
                {request.serviceCode} • {de.serviceCodes[request.serviceCode as keyof typeof de.serviceCodes] || request.serviceCode}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Request Type */}
        <View style={styles.requestTypeRow}>
          <View
            style={[
              styles.requestTypeBadge,
              { backgroundColor: getRequestTypeColor(request.requestType) + "20" },
            ]}
          >
            <Text
              style={[
                styles.requestTypeText,
                { color: getRequestTypeColor(request.requestType) },
              ]}
            >
              {getRequestTypeLabel(request.requestType)} Anfrage
            </Text>
          </View>
        </View>

        {/* Suggested Date/Time for Reschedule */}
        {request.requestType === "edit" && request.suggestedDate && (
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Vorgeschlagen:</Text>
            <Text style={styles.suggestionValue}>
              {request.suggestedDate} • {request.suggestedStartTime}-{request.suggestedEndTime}
            </Text>
          </View>
        )}

        {/* Note Preview */}
        {request.note && (
          <View style={styles.notePreview}>
            <Text style={styles.noteLabel}>Notiz:</Text>
            <Text style={styles.noteText} numberOfLines={2}>
              {request.note}
            </Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.footer}>
          <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>
          <Text style={styles.viewDetails}>Details ansehen →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  serviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serviceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  requestTypeRow: {
    marginBottom: SPACING.sm,
  },
  requestTypeBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.infoLight,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  suggestionValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  notePreview: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  viewDetails: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
});