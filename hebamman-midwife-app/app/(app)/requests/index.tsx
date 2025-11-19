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

// Component Imports
import RequestCard from "@/components/requests/RequestCard";
import RequestDetailsModal from "@/components/requests/RequestDetailsModal";
import RescheduleApprovalModal from "@/components/requests/RescheduleApprovalModal";

// -------------------- Theme --------------------
const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  pending: "#EAB308",
  approved: "#22C55E",
  rejected: "#EF4444",
  line: "#E5E7EB",
};

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
    return date.toLocaleDateString(undefined, {
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
  return type === "edit" ? "Reschedule" : "Cancellation";
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
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: 8, color: COLORS.dim }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Requests</Text>
        <Text style={styles.subtitle}>{counts.all} total requests</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <FilterButton
              label={`All (${counts.all})`}
              isActive={filter === "all"}
              onPress={() => setFilter("all")}
            />
            <FilterButton
              label={`Pending (${counts.pending})`}
              isActive={filter === "pending"}
              onPress={() => setFilter("pending")}
            />
            <FilterButton
              label={`Approved (${counts.approved})`}
              isActive={filter === "approved"}
              onPress={() => setFilter("approved")}
            />
            <FilterButton
              label={`Rejected (${counts.rejected})`}
              isActive={filter === "rejected"}
              onPress={() => setFilter("rejected")}
            />
          </View>
        </ScrollView>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: COLORS.rejected }}>{error}</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={
          <View style={[styles.center, { padding: 24 }]}>
            <Text style={{ color: COLORS.dim, textAlign: "center" }}>
              {loading ? "Loading requests..." : `No ${filter !== "all" ? filter : ""} requests found`}
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
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.dim,
    marginTop: 4,
  },

  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.dim,
  },
  filterBtnTextActive: {
    color: "white",
  },
});