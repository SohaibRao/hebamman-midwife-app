// app/(admin)/midwife-selection.tsx
import { useAuth, SelectedMidwife } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  input: "#F3F5F4",
  line: "#E5E7EB",
  danger: "#B00020",
};

type MidwifeData = {
  _id: string;
  userId: string;
  personalInfo?: {
    profileImage?: {
      url?: string;
    };
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  midwifeStatus?: boolean;
  isProfileComplete?: boolean;
  createdAt?: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data?: MidwifeData[];
};

export default function MidwifeSelectionScreen() {
  const router = useRouter();
  const { user, logout, selectMidwife } = useAuth();
  
  const [midwives, setMidwives] = useState<MidwifeData[]>([]);
  const [filteredMidwives, setFilteredMidwives] = useState<MidwifeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMidwives = useCallback(async () => {
    try {
      setError(null);
      const res = await api("/api/midwives");
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const json: ApiResponse = await res.json();
      
      if (!json.success || !json.data) {
        throw new Error(json.message || "Failed to fetch midwives");
      }
      
      setMidwives(json.data);
      setFilteredMidwives(json.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load midwives");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMidwives();
  }, [fetchMidwives]);

  // Filter midwives based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMidwives(midwives);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = midwives.filter((m) => {
      const firstName = m.personalInfo?.firstName?.toLowerCase() || "";
      const lastName = m.personalInfo?.lastName?.toLowerCase() || "";
      const email = m.personalInfo?.email?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`;
      
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        email.includes(query)
      );
    });
    
    setFilteredMidwives(filtered);
  }, [searchQuery, midwives]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMidwives();
  }, [fetchMidwives]);

  const handleSelectMidwife = async (midwife: MidwifeData) => {
    const firstName = midwife.personalInfo?.firstName || "";
    const lastName = midwife.personalInfo?.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || "Midwife";
    
    const selected: SelectedMidwife = {
      id: midwife._id,
      userId: midwife.userId,
      name,
    };
    
    await selectMidwife(selected);
    router.replace("/(app)/dashboard");
  };

  const getInitials = (midwife: MidwifeData) => {
    const firstName = midwife.personalInfo?.firstName || "";
    const lastName = midwife.personalInfo?.lastName || "";
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName[0].toUpperCase();
    }
    return "M";
  };

  const renderMidwife = ({ item }: { item: MidwifeData }) => {
    const firstName = item.personalInfo?.firstName || "";
    const lastName = item.personalInfo?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Unknown Midwife";
    const email = item.personalInfo?.email || "No email";
    const phone = item.personalInfo?.phone || "";
    const profileImageUrl = item.personalInfo?.profileImage?.url;
    const isActive = item.midwifeStatus;
    const isComplete = item.isProfileComplete;
    
    return (
      <TouchableOpacity
        style={styles.midwifeCard}
        onPress={() => handleSelectMidwife(item)}
        activeOpacity={0.7}
      >
        <View style={styles.midwifeRow}>
          {/* Profile Image or Initials */}
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(item)}</Text>
            </View>
          )}
          
          {/* Info */}
          <View style={styles.midwifeInfo}>
            <Text style={styles.midwifeName}>{fullName}</Text>
            <Text style={styles.midwifeEmail}>{email}</Text>
            {phone ? <Text style={styles.midwifePhone}>{phone}</Text> : null}
          </View>
          
          {/* Status Badges */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
            </View>
            {isComplete && (
              <View style={[styles.statusBadge, styles.badgeComplete]}>
                <Text style={styles.statusText}>Complete</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading midwives...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {user?.username || user?.email || "Admin"}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Select a Midwife</Text>
        <Text style={styles.subtitle}>
          Choose a midwife to manage their dashboard and appointments
        </Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.dim}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{midwives.length}</Text>
          <Text style={styles.statLabel}>Total Midwives</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {midwives.filter(m => m.midwifeStatus).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{filteredMidwives.length}</Text>
          <Text style={styles.statLabel}>Showing</Text>
        </View>
      </View>
      
      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchMidwives}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Midwife List */}
      <FlatList
        data={filteredMidwives}
        keyExtractor={(item) => item._id}
        renderItem={renderMidwife}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "No midwives found matching your search"
                : "No midwives registered yet"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.dim,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.dim,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    position: "relative",
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  clearBtn: {
    position: "absolute",
    right: 32,
    top: 14,
    padding: 4,
  },
  clearBtnText: {
    color: COLORS.dim,
    fontSize: 16,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.accent,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.dim,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  midwifeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  midwifeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.sage,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  midwifeInfo: {
    flex: 1,
  },
  midwifeName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  midwifeEmail: {
    fontSize: 14,
    color: COLORS.dim,
    marginTop: 2,
  },
  midwifePhone: {
    fontSize: 12,
    color: COLORS.sage,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: "#22C55E20",
  },
  badgeInactive: {
    backgroundColor: "#EF444420",
  },
  badgeComplete: {
    backgroundColor: "#3B82F620",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  },
  arrowContainer: {
    paddingLeft: 12,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.accent,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  retryText: {
    color: COLORS.accent,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.dim,
    fontSize: 16,
  },
});