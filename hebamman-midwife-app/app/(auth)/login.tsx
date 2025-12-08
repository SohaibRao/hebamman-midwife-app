// app/(auth)/login.tsx
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Link } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth } from "@/context/AuthContext";

const COLORS = {
  sage: "#7F9086",
  sageDark: "#6F8076",
  btn: "#2E5A49",
  text: "#1D1D1F",
  dim: "#5C6B63",
  card: "#FFFFFF",
  input: "#F3F5F4",
  danger: "#B00020",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, status, error, user, selectedMidwife } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    console.log("#user: ", user);
    if (status === "signed-in" && user) {
      // Route based on user role
      if (user.role === "superuser") {
        // Superuser: Check if they have a selected midwife
        if (selectedMidwife) {
          // Already has a selected midwife, go to dashboard
          router.replace("/(app)/dashboard");
        } else {
          // Needs to select a midwife first
          router.replace("/(admin)/midwife-selection");
        }
      } else if (user.role === "midwife") {
        // Regular midwife goes directly to dashboard
        router.replace("/(app)/dashboard");
      }
    }
  }, [status, user, selectedMidwife, router]);

  const disabled = !email || !password || status === "signing-in";

  const onSubmit = () => {
    login({ email: email.trim(), password });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8F7" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Hero header */}
        <View style={styles.hero}>
          <Image
            source={{ uri: "https://placehold.co/160x160?text=hb" }}
            style={styles.logo}
          />
          <Text style={styles.brand}>hebammenbüro</Text>
          <Text style={styles.tagline}>
            geschaffen für freiberufliche Hebammen
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Anmelden</Text>

          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            placeholder="name@beispiel.de"
            placeholderTextColor={COLORS.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Passwort</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={COLORS.dim}
            secureTextEntry
            autoComplete="password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />

          {/* Forgot Password Link */}
          <View style={styles.forgotPasswordContainer}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={styles.forgotPasswordText}>
                  Passwort vergessen?
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, disabled && styles.btnDisabled]}
            onPress={onSubmit}
            disabled={disabled}
          >
            {status === "signing-in" ? (
              <ActivityIndicator color={COLORS.card} />
            ) : (
              <Text style={styles.btnText}>Anmelden</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: COLORS.sage + "15",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.dim,
    textAlign: "center",
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 20,
    padding: 24,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: 12,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.btn,
    fontWeight: "600",
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: COLORS.btn,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: {
    backgroundColor: COLORS.dim,
  },
  btnText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "700",
  },
});