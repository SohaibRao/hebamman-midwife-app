import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/context/NotificationContext";
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHr < 24) return `vor ${diffHr} Std.`;
  if (diffDay < 7) return `vor ${diffDay} ${diffDay === 1 ? "Tag" : "Tagen"}`;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type NotificationItem = {
  _id: string;
  midwifeId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } =
    useNotifications();

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => {
        if (!item.isRead) markAsRead(item._id);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View
          style={[
            styles.iconContainer,
            !item.isRead && styles.iconContainerUnread,
          ]}
        >
          <Ionicons
            name={item.isRead ? "notifications-outline" : "notifications"}
            size={20}
            color={item.isRead ? COLORS.textSecondary : COLORS.primary}
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header bar with mark all as read */}
      {unreadCount > 0 && (
        <View style={styles.headerBar}>
          <Text style={styles.headerCount}>
            {unreadCount} ungelesen
          </Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Alle als gelesen markieren</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={COLORS.textLight}
          />
          <Text style={styles.emptyText}>Keine Benachrichtigungen</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCount: {
    fontSize: TYPOGRAPHY.size14,
    fontWeight: TYPOGRAPHY.weightSemiBold,
    color: COLORS.textSecondary,
  },
  markAllText: {
    fontSize: TYPOGRAPHY.size14,
    fontWeight: TYPOGRAPHY.weightSemiBold,
    color: COLORS.primary,
  },
  list: {
    padding: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardUnread: {
    backgroundColor: "#FFF8F8",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundGray,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  iconContainerUnread: {
    backgroundColor: COLORS.notificationBg,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size14,
    fontWeight: TYPOGRAPHY.weightMedium,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardTitleUnread: {
    fontWeight: TYPOGRAPHY.weightBold,
    color: COLORS.text,
  },
  cardTime: {
    fontSize: TYPOGRAPHY.size12,
    color: COLORS.textLight,
  },
  cardMessage: {
    fontSize: TYPOGRAPHY.size14,
    color: COLORS.text,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxxl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size16,
    color: COLORS.textLight,
    marginTop: SPACING.lg,
  },
});
