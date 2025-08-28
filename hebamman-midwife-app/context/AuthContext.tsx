import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "@/lib/api";

type User = {
  id: string;
  username: string;
  email: string;
  role: "midwife" | string;
};

type AuthStatus = "loading" | "signed-in" | "signed-out" | "signing-in";

type LoginInput = { email: string; password: string };

type AuthContextType = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "hb_token";
const USER_KEY = "hb_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // boot: load existing session
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
          setStatus("signed-in");
        } else {
          setStatus("signed-out");
        }
      } catch {
        setStatus("signed-out");
      }
    })();
  }, []);

  const login = async ({ email, password }: LoginInput) => {
    setError(null);
    setStatus("signing-in");
    try {
      const res = await api("/api/midwife/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Login fehlgeschlagen");
      }
      const data = await res.json() as {
        success: boolean;
        token: string;
        user: User;
      };

      if (data?.user?.role !== "midwife") {
        throw new Error(`Sie sind als ${data?.user?.role} registriert. Dies ist das Midwife-Dashboard.`);
      }

      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setStatus("signed-in");
    } catch (e: any) {
      setError(e.message ?? "Unbekannter Fehler");
      setStatus("signed-out");
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus("signed-out");
  };

  const value = useMemo(
    () => ({ status, user, token, error, login, logout }),
    [status, user, token, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
