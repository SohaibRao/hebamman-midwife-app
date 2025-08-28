import { Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";

export default function AppLayout() {
  const { status } = useAuth();

  if (status !== "signed-in") {
    return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#7F9086" },
        headerTintColor: "white",
        headerTitleStyle: { fontWeight: "700" },
      }}
    />
  );
}
