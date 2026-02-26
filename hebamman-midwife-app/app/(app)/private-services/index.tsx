import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  PrivateServiceBooking,
  usePrivateServiceBookings,
  privateServiceDisplayDate,
  privateServiceTimeRange,
  privateServiceFullName,
} from "@/hooks/usePrivateServiceBookings";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";

type FilterType = "upcoming" | "past" | "cancelled" | "all";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "upcoming", label: de.appointments.upcoming },
  { key: "past", label: de.appointments.past },
  { key: "cancelled", label: de.patients.status.cancelled },
  { key: "all", label: de.common.all },
];

const ACCENT = COLORS.servicePrivate;
const ACCENT_BG = "#f5f3ff"; // violet-50

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return { bg: COLORS.successLight, text: COLORS.success };
    case "completed":
      return { bg: COLORS.primaryLight, text: COLORS.primaryDark };
    case "cancelled":
      return { bg: COLORS.errorLight, text: COLORS.error };
    case "pending":
      return { bg: COLORS.warningLight, text: COLORS.warning };
    default:
      return { bg: COLORS.warningLight, text: COLORS.warning };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return de.privateServices.statusActive;
    case "completed":
      return de.privateServices.statusCompleted;
    case "cancelled":
      return de.privateServices.statusCancelled;
    case "pending":
      return de.privateServices.statusPending;
    default:
      return status;
  }
}

export default function PrivateServicesScreen() {
  const { getEffectiveUserId } = useAuth();
  const effectiveUserId = getEffectiveUserId();
  const { data: profile } = useMidwifeProfile(effectiveUserId);
  const midwifeId = profile?._id;

  const { upcoming, past, cancelled, bookings, loading, error, refresh } =
    usePrivateServiceBookings(midwifeId);

  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [selectedBooking, setSelectedBooking] =
    useState<PrivateServiceBooking | null>(null);

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
        return de.privateServices.noUpcoming;
      case "past":
        return de.privateServices.noPast;
      case "cancelled":
        return de.privateServices.noCancelled;
      default:
        return de.privateServices.noBookings;
    }
  }, [filter]);

  const renderBookingCard = ({ item }: { item: PrivateServiceBooking }) => {
    const time = privateServiceTimeRange(item);
    const statusColor = getStatusColor(item.status);
    const isCancelled = item.status === "cancelled";
    const fullName = privateServiceFullName(item);
    const isCourse = item.bookingType === "course";

    return (
      <TouchableOpacity
        style={[styles.bookingCard, isCancelled && styles.cardCancelled]}
        onPress={() => setSelectedBooking(item)}
        activeOpacity={0.7}
      >
        {/* Time or session count on the left */}
        <View style={styles.timeContainer}>
          {isCourse ? (
            <>
              <Text style={styles.timeText}>
                {item.courseSessions?.length || 0}x
              </Text>
              <Text style={styles.timeEndText}>{de.privateServices.sessions}</Text>
            </>
          ) : (
            <>
              <Text style={styles.timeText}>{time.start}</Text>
              <Text style={styles.timeEndText}>{time.end}</Text>
            </>
          )}
        </View>

        {/* Info in the middle */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Ionicons name="briefcase" size={16} color={ACCENT} />
            <Text style={styles.serviceNameText} numberOfLines={1}>
              {item.serviceName}
            </Text>
          </View>
          <View style={styles.clientRow}>
            <Ionicons name="person" size={12} color={COLORS.textSecondary} />
            <Text style={styles.clientNameText}>{fullName}</Text>
          </View>
          <View style={styles.typeBadgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: ACCENT_BG }]}>
              <Text style={[styles.typeBadgeText, { color: ACCENT }]}>
                {item.serviceType === "In persona"
                  ? de.privateServices.typeInPersona
                  : de.privateServices.typeVideocall}
              </Text>
            </View>
            {isCourse && (
              <View
                style={[styles.typeBadge, { backgroundColor: COLORS.infoLight }]}
              >
                <Text style={[styles.typeBadgeText, { color: COLORS.info }]}>
                  {de.privateServices.bookingTypeCourse}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Status badge on the right */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
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
          <Ionicons name="briefcase" size={24} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{de.privateServices.title}</Text>
          <Text style={styles.headerSubtitle}>
            {de.privateServices.subtitle}
          </Text>
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
              <Ionicons
                name="briefcase-outline"
                size={48}
                color={COLORS.textLight}
              />
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
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {de.privateServices.details}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Status Badge */}
                <View style={styles.modalStatusRow}>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      {
                        backgroundColor: getStatusColor(selectedBooking.status)
                          .bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        {
                          color: getStatusColor(selectedBooking.status).text,
                        },
                      ]}
                    >
                      {getStatusLabel(selectedBooking.status)}
                    </Text>
                  </View>
                  <View
                    style={[styles.modalStatusBadge, { backgroundColor: ACCENT_BG }]}
                  >
                    <Ionicons name="briefcase" size={14} color={ACCENT} />
                    <Text style={[styles.modalStatusText, { color: ACCENT }]}>
                      {selectedBooking.bookingType === "course"
                        ? de.privateServices.bookingTypeCourse
                        : de.privateServices.bookingTypeSingle}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <DetailRow
                  icon="briefcase"
                  label={de.privateServices.serviceName}
                  value={selectedBooking.serviceName}
                />
                <DetailRow
                  icon="person"
                  label={de.privateServices.client}
                  value={privateServiceFullName(selectedBooking)}
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
                  icon="location"
                  label={de.privateServices.serviceType}
                  value={
                    selectedBooking.serviceType === "In persona"
                      ? de.privateServices.typeInPersona
                      : de.privateServices.typeVideocall
                  }
                />
                <DetailRow
                  icon="people"
                  label={de.privateServices.serviceMode}
                  value={
                    selectedBooking.serviceMode === "Individual"
                      ? de.privateServices.modeIndividual
                      : de.privateServices.modeGroup
                  }
                />
                <DetailRow
                  icon="time"
                  label={de.privateServices.duration}
                  value={`${selectedBooking.duration} ${de.privateServices.minutes}`}
                />
                <DetailRow
                  icon="pricetag"
                  label={de.privateServices.price}
                  value={`${(parseFloat(String(selectedBooking.price ?? '')) || 0).toFixed(2)} \u20AC`}
                />

                {selectedBooking.bookingType === "single" && (
                  <>
                    <DetailRow
                      icon="calendar"
                      label={de.privateServices.date}
                      value={privateServiceDisplayDate(selectedBooking)}
                    />
                    <DetailRow
                      icon="time"
                      label={de.privateServices.timeSlot}
                      value={
                        selectedBooking.selectedSlot?.replace("-", " \u2013 ") ||
                        "\u2014"
                      }
                    />
                  </>
                )}

                {/* Course sessions */}
                {selectedBooking.bookingType === "course" &&
                  selectedBooking.courseSessions &&
                  selectedBooking.courseSessions.length > 0 && (
                    <View style={styles.sessionsContainer}>
                      <Text style={styles.sessionsTitle}>
                        {de.privateServices.sessions} (
                        {selectedBooking.courseSessions.length})
                      </Text>
                      {selectedBooking.courseSessions.map((session, idx) => (
                        <View key={idx} style={styles.sessionRow}>
                          <View style={styles.sessionNumber}>
                            <Text style={styles.sessionNumberText}>
                              {session.sessionNumber}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sessionDate}>
                              {session.day}, {session.date}
                            </Text>
                            <Text style={styles.sessionTime}>
                              {session.startTime} \u2013 {session.endTime}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
              </ScrollView>
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
    backgroundColor: ACCENT_BG,
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
    backgroundColor: ACCENT,
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
    backgroundColor: ACCENT,
    borderColor: ACCENT,
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
    minWidth: 50,
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
  serviceNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  clientNameText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  typeBadgeRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
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
    maxHeight: "85%",
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
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: "wrap",
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

  // Course sessions
  sessionsContainer: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  sessionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  sessionNumber: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: ACCENT_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  sessionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
