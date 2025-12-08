// app/(admin)/_layout.tsx
import { Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AdminLayout() {
  const { status, user } = useAuth();

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Redirect to login if not signed in
  if (status !== "signed-in") {
    return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
  }

  // Only allow superusers to access admin routes
  if (user?.role !== "superuser") {
    return <Redirect href={{ pathname: "/(app)/dashboard" } as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}