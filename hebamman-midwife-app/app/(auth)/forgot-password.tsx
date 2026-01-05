// app/(auth)/forgot-password.tsx
import { useState } from "react";
import { useRouter } from "expo-router";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

const COLORS = {
  sage: "#7F9086",
  sageDark: "#6F8076",
  btn: "#2E5A49",
  text: "#1D1D1F",
  dim: "#5C6B63",
  card: "#FFFFFF",
  input: "#F3F5F4",
  danger: "#B00020",
  success: "#10B981",
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setError("");

    // Validate email
    if (!email.trim()) {
      setError("E-Mail ist erforderlich");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Ungültige E-Mail-Adresse");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api("/api/users/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailSent(true);
        // Show success alert
        Alert.alert(
          "E-Mail gesendet!",
          "Überprüfen Sie Ihre E-Mail für den Link zum Zurücksetzen des Passworts.",
          [{ text: "OK" }]
        );
      } else {
        setError(result.error || "Fehler beim Senden des Reset-Links");
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError("Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  if (emailSent) {
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
          </View>

          {/* Success Card */}
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={COLORS.success} />
            </View>

            <Text style={styles.cardTitle}>E-Mail überprüfen</Text>
            <Text style={styles.description}>
              Wir haben Ihnen einen Link zum Zurücksetzen des Passworts gesendet
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Wenn ein Konto mit Ihrer E-Mail existiert, erhalten Sie in Kürze einen Link zum Zurücksetzen des Passworts.
              </Text>
            </View>

            <View style={styles.reminderBox}>
              <Text style={styles.reminderText}>
                Der Link läuft in <Text style={styles.boldText}>5 Minuten</Text> ab.
              </Text>
              <Text style={[styles.reminderText, { marginTop: 8 }]}>
                E-Mail nicht erhalten? Überprüfen Sie Ihren Spam-Ordner.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setEmailSent(false)}
            >
              <Text style={styles.linkButtonText}>Einen weiteren Link senden</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Text style={styles.backButtonText}>Zurück zur Anmeldung</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Passwort vergessen?</Text>
          <Text style={styles.description}>
            Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Reset-Link
          </Text>

          <Text style={styles.label}>E-Mail*</Text>
          <TextInput
            placeholder="abc@beispiel.de"
            placeholderTextColor={COLORS.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isSubmitting}
          />

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.card} />
            ) : (
              <Text style={styles.btnText}>Reset-Link senden</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLinkContainer}
            onPress={handleBackToLogin}
            disabled={isSubmitting}
          >
            <View style={styles.backLinkContent}>
              <Ionicons name="arrow-back" size={16} color={COLORS.btn} />
              <Text style={styles.backLinkText}>Zurück zur Anmeldung</Text>
            </View>
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
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: COLORS.dim,
    textAlign: "center",
    marginBottom: 32,
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
    marginBottom: 8,
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
    marginTop: 16,
  },
  btnDisabled: {
    backgroundColor: COLORS.dim,
  },
  btnText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "700",
  },
  backLinkContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  backLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backLinkText: {
    fontSize: 14,
    color: COLORS.btn,
    fontWeight: "600",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success + "20",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: COLORS.success + "10",
    borderWidth: 1,
    borderColor: COLORS.success + "30",
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
  },
  reminderBox: {
    marginVertical: 16,
  },
  reminderText: {
    fontSize: 14,
    color: COLORS.dim,
    textAlign: "center",
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.text,
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  linkButtonText: {
    fontSize: 14,
    color: COLORS.btn,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
});