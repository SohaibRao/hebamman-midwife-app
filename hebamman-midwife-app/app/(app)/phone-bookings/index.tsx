import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import {
  PhoneBooking,
  usePhoneBookings,
  phoneBookingDisplayDate,
  phoneBookingTimeRange,
} from "@/hooks/usePhoneBookings";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";

type FilterType = "upcoming" | "past" | "cancelled" | "all";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "upcoming", label: de.appointments.upcoming },
  { key: "past", label: de.appointments.past },
  { key: "cancelled", label: de.patients.status.cancelled },
  { key: "all", label: de.common.all },
];

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return { bg: COLORS.successLight, text: COLORS.success };
    case "completed":
      return { bg: COLORS.primaryLight, text: COLORS.primaryDark };
    case "cancelled":
      return { bg: COLORS.errorLight, text: COLORS.error };
    default:
      return { bg: COLORS.warningLight, text: COLORS.warning };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return de.phoneBookings.statusActive;
    case "completed":
      return de.phoneBookings.statusCompleted;
    case "cancelled":
      return de.phoneBookings.statusCancelled;
    default:
      return status;
  }
}

export default function PhoneBookingsScreen() {
  const { getEffectiveUserId } = useAuth();
  const effectiveUserId = getEffectiveUserId();
  const { data: profile } = useMidwifeProfile(effectiveUserId);
  const midwifeId = profile?._id;

  const { upcoming, past, cancelled, bookings, loading, error, refresh } =
    usePhoneBookings(midwifeId);

  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [selectedBooking, setSelectedBooking] = useState<PhoneBooking | null>(null);

  const displayedBookings = useMemo(() => {
    switch (filter) {
      case "upcoming":
        return upcoming;
      case "past":
        return past;
      case "cancelled":
        return cancelled;
      case "all":
        return bookings;
      default:
        return upcoming;
    }
  }, [filter, upcoming, past, cancelled, bookings]);

  const emptyMessage = useMemo(() => {
    switch (filter) {
      case "upcoming":
        return de.phoneBookings.noUpcoming;
      case "past":
        return de.phoneBookings.noPast;
      case "cancelled":
        return de.phoneBookings.noCancelled;
      default:
        return de.phoneBookings.noBookings;
    }
  }, [filter]);

  const renderBookingCard = ({ item }: { item: PhoneBooking }) => {
    const time = phoneBookingTimeRange(item);
    const statusColor = getStatusColor(item.status);
    const isCancelled = item.status === "cancelled";

    return (
      <TouchableOpacity
        style={[styles.bookingCard, isCancelled && styles.cardCancelled]}
        onPress={() => setSelectedBooking(item)}
        activeOpacity={0.7}
      >
        {/* Time on the left */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{time.start}</Text>
          <Text style={styles.timeEndText}>{time.end}</Text>
        </View>

        {/* Info in the middle */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Ionicons name="person" size={16} color={COLORS.textSecondary} />
            <Text style={styles.nameText}>{item.fullName}</Text>
          </View>
          <Text style={styles.dateText}>{phoneBookingDisplayDate(item)}</Text>
          {item.phone && (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={COLORS.textLight} />
              <Text style={styles.phoneText}>{item.phone}</Text>
            </View>
          )}
        </View>

        {/* Status badge on the right */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Ionicons name="call" size={14} color={statusColor.text} />
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.headerInfo}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="call" size={24} color={COLORS.serviceG} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{de.phoneBookings.title}</Text>
          <Text style={styles.headerSubtitle}>{de.phoneBookings.subtitle}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{upcoming.length}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f.key && styles.filterTabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>{de.actions.refresh}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedBookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="call-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={refresh}
        />
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBooking(null)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setSelectedBooking(null)}
          >
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{de.phoneBookings.details}</Text>
                <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status Badge */}
              <View style={styles.modalStatusRow}>
                <View
                  style={[
                    styles.modalStatusBadge,
                    { backgroundColor: getStatusColor(selectedBooking.status).bg },
                  ]}
                >
                  <Ionicons
                    name="call"
                    size={16}
                    color={getStatusColor(selectedBooking.status).text}
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      { color: getStatusColor(selectedBooking.status).text },
                    ]}
                  >
                    {getStatusLabel(selectedBooking.status)}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <DetailRow
                icon="person"
                label={de.phoneBookings.client}
                value={selectedBooking.fullName}
              />
              <DetailRow
                icon="mail"
                label={de.common.email}
                value={selectedBooking.email}
              />
              {selectedBooking.phone && (
                <DetailRow
                  icon="call"
                  label={de.common.phone}
                  value={selectedBooking.phone}
                />
              )}
              <DetailRow
                icon="calendar"
                label={de.phoneBookings.date}
                value={phoneBookingDisplayDate(selectedBooking)}
              />
              <DetailRow
                icon="time"
                label={de.phoneBookings.timeSlot}
                value={selectedBooking.selectedSlot.replace("-", " – ")}
              />
              {selectedBooking.meetingLink && (
                <TouchableOpacity
                  style={styles.detailRow}
                  onPress={() => Linking.openURL(selectedBooking.meetingLink!)}
                >
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="videocam" size={18} color={COLORS.serviceG} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Google Meet</Text>
                    <Text style={[styles.detailValue, { color: COLORS.serviceG }]}>
                      {selectedBooking.meetingLink}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={COLORS.serviceG} />
                </TouchableOpacity>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconContainer}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "#f0fdfa", // teal-50
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: COLORS.serviceG,
    borderRadius: BORDER_RADIUS.full,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: COLORS.background,
    fontWeight: "800",
    fontSize: 16,
  },

  // Filters
  filterWrapper: {
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterContainer: {
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.serviceG,
    borderColor: COLORS.serviceG,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.background,
  },

  // List
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge,
  },

  // Booking Card
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  cardCancelled: {
    opacity: 0.6,
  },
  timeContainer: {
    marginRight: SPACING.lg,
    alignItems: "center",
  },
  timeText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  timeEndText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // Status Badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
    marginLeft: SPACING.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Center/Empty/Error
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.huge,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    color: COLORS.background,
    fontWeight: "700",
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 620,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalStatusRow: {
    marginBottom: SPACING.lg,
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundGray,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
});
