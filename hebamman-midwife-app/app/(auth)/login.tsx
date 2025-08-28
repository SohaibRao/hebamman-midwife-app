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
  sage: "#7F9086", // header/background tint (from your site)
  sageDark: "#6F8076",
  btn: "#2E5A49", // CTA green similar to "Jetzt Beratung vereinbaren"
  text: "#1D1D1F",
  dim: "#5C6B63",
  card: "#FFFFFF",
  input: "#F3F5F4",
  danger: "#B00020",
};

export default function LoginScreen() {
  const router = useRouter(); 
  const { login, status, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  // ⬅️ redirect once signed in
  useEffect(() => {
    if (status === "signed-in") {
      router.replace("/(app)/dashboard");
    }
  }, [status, router]);
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
        {/* Hero header w/ brand tone */}
        <View style={styles.hero}>
          <Image
            // Simple placeholder logo (you can replace with local asset)
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

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            disabled={disabled}
            onPress={onSubmit}
            style={[styles.button, disabled && { opacity: 0.6 }]}
          >
            {status === "signing-in" ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Einloggen</Text>
            )}
          </TouchableOpacity>

          {/* Optional links */}
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ color: COLORS.dim }}>
              Brauchen Sie Hilfe?{" "}
              <Text style={{ color: COLORS.sageDark }}>Kontakt</Text>
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 18 }}>
          <Text style={{ color: COLORS.dim, fontSize: 12 }}>
            © {new Date().getFullYear()} hebammenbüro
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 4,
    color: COLORS.dim,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.dim,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.btn,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: COLORS.danger,
    marginTop: 8,
  },
});
