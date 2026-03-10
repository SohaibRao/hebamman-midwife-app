import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and get the Expo push token.
 * Returns the token string or null if not available.
 * Gracefully returns null in Expo Go (where push is unsupported since SDK 53).
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return null;
    }

    // Check/request permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Standard",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D4A5A5",
        sound: "default",
      });
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "fca4a005-9962-44ec-a4ef-679dd95c5f34",
    });

    return tokenData.data;
  } catch (error) {
    // Expo Go (SDK 53+) does not support push notifications — this is expected
    console.log("Push token unavailable (likely Expo Go):", error);
    return null;
  }
}

/**
 * Register the push token with the backend.
 */
export async function registerPushToken(
  userId: string,
  midwifeId: string,
  token: string
): Promise<void> {
  try {
    await api("/api/public/notifications/register-token", {
      method: "POST",
      body: JSON.stringify({ userId, midwifeId, token }),
    });
  } catch (error) {
    console.error("Failed to register push token:", error);
  }
}

/**
 * Unregister the push token from the backend (call on logout).
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await api("/api/public/notifications/register-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error("Failed to unregister push token:", error);
  }
}
