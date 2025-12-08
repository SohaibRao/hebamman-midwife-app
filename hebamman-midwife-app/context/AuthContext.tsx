import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "@/lib/api";

export type UserRole = "midwife" | "superuser";

type User = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
};

// Selected midwife info when superuser is managing a midwife
export type SelectedMidwife = {
  id: string; // Midwife document _id
  userId: string; // User ID of the midwife
  name: string; // Display name
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
  // Superuser-specific
  selectedMidwife: SelectedMidwife | null;
  selectMidwife: (midwife: SelectedMidwife) => Promise<void>;
  clearSelectedMidwife: () => Promise<void>;
  // Helper to get the effective user ID for API calls
  getEffectiveUserId: () => string | null;
  // Helper to check if currently operating as superuser
  isSuperuser: boolean;
  // Helper to check if superuser has selected a midwife
  isManagingMidwife: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "hb_token";
const USER_KEY = "hb_user";
const SELECTED_MIDWIFE_KEY = "hb_selected_midwife";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMidwife, setSelectedMidwife] = useState<SelectedMidwife | null>(null);

  // boot: load existing session
  useEffect(() => {
    (async () => {
      try {
        const [t, u, sm] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(SELECTED_MIDWIFE_KEY),
        ]);
        if (t && u) {
          const parsedUser = JSON.parse(u) as User;
          setToken(t);
          setUser(parsedUser);
          
          // If superuser and has previously selected a midwife, restore it
          if (parsedUser.role === "superuser" && sm) {
            setSelectedMidwife(JSON.parse(sm) as SelectedMidwife);
          }
          
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

      // Allow both midwife and superuser roles
      const allowedRoles: UserRole[] = ["midwife", "superuser"];
      console.log("data?.user?.role: ", data?.user);
      if (!allowedRoles.includes(data?.user?.role as UserRole)) {
        throw new Error(`Sie sind als ${data?.user?.role} registriert. Nur Hebammen und Administratoren können sich anmelden.`);
      }

      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      
      // Clear any previously selected midwife on new login
      await SecureStore.deleteItemAsync(SELECTED_MIDWIFE_KEY);
      setSelectedMidwife(null);
      
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
    await SecureStore.deleteItemAsync(SELECTED_MIDWIFE_KEY);
    setToken(null);
    setUser(null);
    setSelectedMidwife(null);
    setStatus("signed-out");
  };

  // Select a midwife (for superuser)
  const selectMidwife = useCallback(async (midwife: SelectedMidwife) => {
    await SecureStore.setItemAsync(SELECTED_MIDWIFE_KEY, JSON.stringify(midwife));
    setSelectedMidwife(midwife);
  }, []);

  // Clear selected midwife (go back to midwife selection)
  const clearSelectedMidwife = useCallback(async () => {
    await SecureStore.deleteItemAsync(SELECTED_MIDWIFE_KEY);
    setSelectedMidwife(null);
  }, []);

  // Get the effective user ID for API calls
  // If superuser has selected a midwife, return the midwife's userId
  // Otherwise return the current user's id
  const getEffectiveUserId = useCallback((): string | null => {
    if (user?.role === "superuser" && selectedMidwife) {
      return selectedMidwife.userId;
    }
    return user?.id ?? null;
  }, [user, selectedMidwife]);

  const isSuperuser = user?.role === "superuser";
  const isManagingMidwife = isSuperuser && selectedMidwife !== null;

  const value = useMemo(
    () => ({
      status,
      user,
      token,
      error,
      login,
      logout,
      selectedMidwife,
      selectMidwife,
      clearSelectedMidwife,
      getEffectiveUserId,
      isSuperuser,
      isManagingMidwife,
    }),
    [status, user, token, error, selectedMidwife, selectMidwife, clearSelectedMidwife, getEffectiveUserId, isSuperuser, isManagingMidwife]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}