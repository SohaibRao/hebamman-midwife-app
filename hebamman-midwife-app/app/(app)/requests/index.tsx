// app/(app)/requests/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

// Component Imports
import RequestCard from "@/components/requests/RequestCard";
import RequestDetailsModal from "@/components/requests/RequestDetailsModal";
import RescheduleApprovalModal from "@/components/requests/RescheduleApprovalModal";

// -------------------- Types --------------------
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

type UserDetail = {
  name: string;
  email: string;
  role: string;
};

type FilterType = "all" | "pending" | "approved" | "rejected";

// -------------------- Helpers --------------------
async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getRequestTypeLabel = (type: RequestType) => {
  return type === "edit" ? de.requests.types.reschedule : de.requests.types.cancellation;
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

// -------------------- Main Component --------------------
export default function RequestsScreen() {
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = pf.data as any;
  const midwifeId = midwifeProfile?._id ?? "";

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  // User details for displaying client names
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Fetch user details helper
  const fetchUserDetails = async (clientIds: string[]) => {
    if (clientIds.length === 0) return;
    
    try {
      const res = await api("/api/public/user/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: clientIds }),
      });
      const json = await readJsonSafe<{ success: boolean; data: Record<string, UserDetail> }>(res);
      if (json?.success && json.data) {
        setUserDetails(prev => ({ ...prev, ...json.data }));
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Fetch requests
  const fetchRequests = useCallback(async (isRefreshing = false) => {
    if (!midwifeId) return;

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api(`/api/public/clientRequest?midwifeId=${midwifeId}`);
      const json = await readJsonSafe<{
        success: boolean;
        message: string;
        count: number;
        data: Request[];
      }>(res);

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch requests");
      }

      const fetchedRequests = json.data || [];
      setRequests(fetchedRequests);

      // Extract unique client IDs and fetch their details
      const clientIds = [...new Set(fetchedRequests.map(r => r.clientId))];
      await fetchUserDetails(clientIds);

    } catch (e: any) {
      setError(e?.message ?? "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [midwifeId]);

  useEffect(() => {
    if (pf.status === "success" && midwifeId) {
      fetchRequests();
    }
  }, [pf.status, midwifeId, fetchRequests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter(r => r.status === filter);
  }, [requests, filter]);

  // Get counts for filters
  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === "pending").length,
      approved: requests.filter(r => r.status === "approved").length,
      rejected: requests.filter(r => r.status === "rejected").length,
    };
  }, [requests]);

  // Get client name
  const getClientName = (clientId: string) => {
    return userDetails[clientId]?.name || "Loading...";
  };

  // Handle request selection
  const openRequestDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  // Handle reschedule edit
  const openRescheduleEdit = (request: Request) => {
    setSelectedRequest(request);
    setShowDetailsModal(false);
    setShowRescheduleModal(true);
  };

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false);
    setSelectedRequest(null);
  };

  // Refresh handler
  const onRefresh = () => {
    fetchRequests(true);
  };

  // Loading state
  if (pf.status === "loading" || (!midwifeId && loading)) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.backgroundGray }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 8, color: COLORS.textSecondary }}>{de.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.backgroundGray }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{de.requests.title}</Text>
        <Text style={styles.subtitle}>{counts.all} {de.requests.totalCount}</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Nach Status filtern</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <FilterButton
              label={`${de.common.all} (${counts.all})`}
              isActive={filter === "all"}
              onPress={() => setFilter("all")}
            />
            <FilterButton
              label={`${de.requests.status.pending} (${counts.pending})`}
              isActive={filter === "pending"}
              onPress={() => setFilter("pending")}
            />
            <FilterButton
              label={`${de.requests.status.approved} (${counts.approved})`}
              isActive={filter === "approved"}
              onPress={() => setFilter("approved")}
            />
            <FilterButton
              label={`${de.requests.status.rejected} (${counts.rejected})`}
              isActive={filter === "rejected"}
              onPress={() => setFilter("rejected")}
            />
          </View>
        </ScrollView>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}>
          <Text style={{ color: COLORS.error }}>{error}</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={[styles.center, { padding: SPACING.xxl }]}>
            <Text style={{ color: COLORS.textSecondary, textAlign: "center" }}>
              {loading ? "Anfragen werden geladen..." : `Keine ${filter !== "all" ? filter : ""} Anfragen gefunden`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            clientName={getClientName(item.clientId)}
            onPress={() => openRequestDetails(item)}
          />
        )}
      />

      {/* Modals */}
      <RequestDetailsModal
        visible={showDetailsModal}
        request={selectedRequest}
        onClose={closeDetailsModal}
        onRescheduleEdit={openRescheduleEdit}
        onRequestUpdated={fetchRequests}
        getClientName={getClientName}
        midwifeId={midwifeId}
      />

      <RescheduleApprovalModal
        visible={showRescheduleModal}
        request={selectedRequest}
        onClose={closeRescheduleModal}
        onSuccess={() => {
          closeRescheduleModal();
          fetchRequests();
        }}
        midwifeId={midwifeId}
      />
    </View>
  );
}

// -------------------- Filter Button Component --------------------
function FilterButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterBtn, isActive && styles.filterBtnActive]}
    >
      <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  filterContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  filterBtnTextActive: {
    color: COLORS.background,
  },
});