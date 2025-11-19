// components/requests/RequestCard.tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
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

const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": "#7c3aed",
  "A1": "#7c3aed",
  B1: "#2563eb",
  B2: "#0ea5e9",
  E1: "#f59e0b",
  C1: "#16a34a",
  C2: "#10b981",
  D1: "#ef4444",
  D2: "#f97316",
  F1: "#a855f7",
};

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
  return type === "edit" ? "Reschedule" : "Cancellation";
};

const getRequestTypeColor = (type: RequestType) => {
  return type === "edit" ? "#3B82F6" : "#EF4444";
};

const getStatusBadgeStyle = (status: RequestStatus) => {
  const styles: Record<RequestStatus, any> = {
    pending: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    },
    approved: {
      backgroundColor: "#D1FAE5",
      color: "#065F46",
    },
    rejected: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
    },
  };
  return styles[status];
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
};

export default function RequestCard({ request, clientName, onPress }: Props) {
  const serviceColor = SERVICE_COLORS[request.serviceCode] ?? COLORS.sage;
  const statusStyle = getStatusBadgeStyle(request.status);

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
                {request.serviceCode} • {SERVICE_NAMES[request.serviceCode] || request.serviceCode}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {request.status.toUpperCase()}
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
              {getRequestTypeLabel(request.requestType)} Request
            </Text>
          </View>
        </View>

        {/* Suggested Date/Time for Reschedule */}
        {request.requestType === "edit" && request.suggestedDate && (
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Suggested:</Text>
            <Text style={styles.suggestionValue}>
              {request.suggestedDate} • {request.suggestedStartTime}-{request.suggestedEndTime}
            </Text>
          </View>
        )}

        {/* Note Preview */}
        {request.note && (
          <View style={styles.notePreview}>
            <Text style={styles.noteLabel}>Note:</Text>
            <Text style={styles.noteText} numberOfLines={2}>
              {request.note}
            </Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.footer}>
          <Text style={styles.dateText}>{formatDate(request.createdAt)}</Text>
          <Text style={styles.viewDetails}>View Details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
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
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serviceText: {
    fontSize: 13,
    color: COLORS.dim,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  requestTypeRow: {
    marginBottom: 10,
  },
  requestTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginRight: 6,
  },
  suggestionValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  notePreview: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 4,
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
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.sage,
    fontWeight: "600",
  },
  viewDetails: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "700",
  },
});