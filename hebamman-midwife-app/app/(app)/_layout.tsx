import { Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { TouchableOpacity, Text, View, StyleSheet, Modal, ScrollView } from "react-native";
import { useState } from "react";
import { COLORS } from "@/constants/theme";
import de from "@/constants/i18n";

function MenuButton() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigateTo = (path: string) => {
    setVisible(false);
    router.push(path as any);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={{ marginLeft: 15 }}>
        <Text style={{ fontSize: 24, color: "white", fontWeight: "700" }}>☰</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.menuContainer}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || "M"}
                </Text>
              </View>
              <Text style={styles.userName}>{user?.username || "Midwife"}</Text>
              <Text style={styles.userEmail}>{user?.email || ""}</Text>
            </View>

            <ScrollView style={styles.menuItems}>
              <MenuItem icon="🏠" label={de.nav.overview} onPress={() => navigateTo("/dashboard")} />
              <MenuItem icon="👥" label="Leads" onPress={() => navigateTo("/(app)/leads")} />
              <MenuItem icon="📅" label={de.nav.appointments} onPress={() => navigateTo("/(app)/appointments")} />
              <MenuItem icon="📋" label={de.nav.requests} onPress={() => navigateTo("/(app)/requests")} />
              <MenuItem icon="👥" label={de.nav.patients} onPress={() => navigateTo("/(app)/patients")} />
              <MenuItem icon="👤" label={de.nav.profile} onPress={() => navigateTo("/(app)/profile")} />
            </ScrollView>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                setVisible(false);
                logout();
              }}
            >
              <Text style={styles.logoutText}>🚪 {de.nav.logout}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { status } = useAuth();

  if (status !== "signed-in") {
    return <Redirect href={{ pathname: "/(auth)/login" } as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "white",
        headerTitleStyle: { fontWeight: "700" },
        headerLeft: () => <MenuButton />,
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{ title: de.appName }}
      />
      <Stack.Screen
        name="leads/index"
        options={{ title: "Leads" }}
      />
      <Stack.Screen
        name="appointments/index"
        options={{ title: de.appointments.title }}
      />
      <Stack.Screen
        name="patients/index"
        options={{ title: de.patients.title }}
      />
      <Stack.Screen
        name="patients/[patientId]/appointments"
        options={{ title: de.appointments.title }}
      />
      <Stack.Screen
        name="profile/index"
        options={{ title: de.profile.title }}
      />
      <Stack.Screen
        name="requests/index"
        options={{ title: de.requests.title }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  menuContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  menuHeader: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  menuItems: {
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  logoutBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});