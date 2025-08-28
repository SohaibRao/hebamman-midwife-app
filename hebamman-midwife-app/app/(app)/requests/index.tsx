import { ScrollView, View, Text, StyleSheet } from "react-native";

export default function RequestsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Patient Requests</Text>
      <Text style={styles.dim}>
        We’ll render the full list and filters once the API is ready.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  wrap: { padding: 16, backgroundColor: "#F6F8F7", flexGrow: 1 },
  h1: { fontSize: 22, fontWeight: "800", color: "#1D1D1F" },
  dim: { color: "#5C6B63", marginTop: 6 },
});
