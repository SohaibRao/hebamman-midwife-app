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
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.backgroundGray }}>
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
            {de.appTagline}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{de.auth.login}</Text>

          <Text style={styles.label}>{de.auth.email}</Text>
          <TextInput
            placeholder="name@beispiel.de"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>{de.auth.password}</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
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
                  {de.auth.forgotPassword}
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
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.btnText}>{de.auth.login}</Text>
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
    backgroundColor: COLORS.primaryLight,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: SPACING.xl,
    padding: SPACING.xxl,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xxl,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  btnDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  btnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
});