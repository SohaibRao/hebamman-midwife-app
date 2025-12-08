import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { status, user, selectedMidwife } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Not signed in - go to login
  if (status !== "signed-in") {
    return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
  }

  // Signed in - route based on role
  if (user?.role === "superuser") {
    // Superuser: Check if they have selected a midwife
    if (selectedMidwife) {
      // Superuser has selected a midwife - show the midwife's dashboard
      return <Redirect href={{ pathname: "/(app)/dashboard" } as any} />;
    } else {
      // Superuser needs to select a midwife first
      return <Redirect href={{ pathname: "/(admin)/midwife-selection" } as any} />;
    }
  }

  if (user?.role === "midwife") {
    // Regular midwife - go directly to dashboard
    return <Redirect href={{ pathname: "/(app)/dashboard" } as any} />;
  }

  // Unknown role - shouldn't happen, but redirect to login as fallback
  return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
}