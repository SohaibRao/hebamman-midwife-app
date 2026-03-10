import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthContext";
import {
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
} from "@/lib/notifications";
import { api } from "@/lib/api";

type NotificationItem = {
  _id: string;
  midwifeId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, user, selectedMidwife, getEffectiveUserId, isSuperuser } =
    useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  // Resolved midwife document _id (fetched from API for midwife-role users)
  const [midwifeDocId, setMidwifeDocId] = useState<string | null>(null);
  const pushTokenRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Resolve midwife document _id
  // For superusers: selectedMidwife.id is already the document _id
  // For midwife-role: fetch it from /api/midwives/userId?userId=...
  useEffect(() => {
    if (status !== "signed-in" || !user) {
      setMidwifeDocId(null);
      return;
    }

    if (isSuperuser && selectedMidwife) {
      setMidwifeDocId(selectedMidwife.id);
      return;
    }

    if (user.role === "midwife") {
      // Fetch midwife document to get _id
      (async () => {
        try {
          const res = await api(
            `/api/midwives/userId?userId=${encodeURIComponent(user.id)}`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data?._id) {
              setMidwifeDocId(json.data._id);
            }
          }
        } catch (error) {
          console.error("Failed to resolve midwife document ID:", error);
        }
      })();
    }
  }, [status, user, isSuperuser, selectedMidwife]);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    if (!midwifeDocId) return;

    setLoading(true);
    try {
      const res = await api(
        `/api/public/notifications?midwifeId=${midwifeDocId}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data.notifications);
          setUnreadCount(data.data.unreadCount);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [midwifeDocId]);

  // Register push token when midwife doc ID is resolved
  useEffect(() => {
    if (status !== "signed-in" || !user || !midwifeDocId) return;

    let cancelled = false;

    (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;

      pushTokenRef.current = token;

      const effectiveUserId = getEffectiveUserId();
      if (effectiveUserId) {
        await registerPushToken(effectiveUserId, midwifeDocId, token);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, user, midwifeDocId, getEffectiveUserId]);

  // Set up notification listeners
  useEffect(() => {
    // When a notification is received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        fetchNotifications();
      });

    // When user taps on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.notificationId) {
          markAsRead(data.notificationId as string);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [fetchNotifications]);

  // Fetch notifications when midwife doc ID becomes available
  useEffect(() => {
    if (status === "signed-in" && midwifeDocId) {
      fetchNotifications();
    }
  }, [status, midwifeDocId, fetchNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await api("/api/public/notifications/mark-read", {
        method: "PATCH",
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!midwifeDocId) return;

    try {
      const res = await api("/api/public/notifications/mark-read", {
        method: "PATCH",
        body: JSON.stringify({ midwifeId: midwifeDocId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [midwifeDocId]);

  // Unregister push token on logout
  useEffect(() => {
    if (status === "signed-out" && pushTokenRef.current) {
      unregisterPushToken(pushTokenRef.current);
      pushTokenRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setMidwifeDocId(null);
    }
  }, [status]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh: fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  return ctx;
}
