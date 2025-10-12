import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return status === "signed-in"
    ? <Redirect href={{ pathname: "/(app)/dashboard" } as any} />
    : <Redirect href={{ pathname: "/(auth)/login" } as any} />;
}