// app/(app)/profile/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
  FlatList,
  ActivityIndicator,
  Alert,
  AppState,
} from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import * as ExpoLinking from "expo-linking";
import { useAuth } from "@/context/AuthContext";
import { useMidwifeProfile, MidwifeProfile } from "@/hooks/useMidwifeProfile";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const { user, getEffectiveUserId } = useAuth();
  const userId = getEffectiveUserId() ?? process.env.EXPO_PUBLIC_MIDWIFE_ID ?? null;

  // --- Google Calendar state ---
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
  const [gcalLastSyncAt, setGcalLastSyncAt] = useState<string | null>(null);
  const gcalOAuthInProgress = useRef(false);

  // Check status and auto-sync if connected but never synced
  const checkGcalStatus = useCallback(async (opts?: { autoSync?: boolean }) => {
    if (!userId) return;
    const shouldAutoSync = opts?.autoSync ?? false;
    try {
      const res = await api(`/api/public/google-calendar/status?userId=${userId}`);
      const data = await res.json();
      console.log("[GCal Status]", JSON.stringify(data));
      const isConnected = data?.connected === true;
      setGcalConnected(isConnected);
      setGcalLastSyncAt(data?.lastSyncAt ?? null);

      // Auto-sync: connected but never synced (lastSyncAt is null/undefined)
      if (shouldAutoSync && isConnected && !data?.lastSyncAt) {
        console.log("[GCal] Connected but never synced — triggering auto-sync");
        setGcalSyncing(true);
        try {
          await api("/api/public/google-calendar/midwife-sync", {
            method: "POST",
            body: JSON.stringify({ userId }),
          });
          setGcalLastSyncAt(new Date().toISOString());
        } catch {
          // sync failed silently — calendar is still connected
        } finally {
          setGcalSyncing(false);
        }
      }
    } catch {
      // ignore
    } finally {
      setGcalLoading(false);
    }
  }, [userId]);

  // Initial status check on mount
  useEffect(() => {
    checkGcalStatus();
  }, [checkGcalStatus]);

  // When app returns to foreground during OAuth, dismiss browser and check status
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && gcalOAuthInProgress.current) {
        gcalOAuthInProgress.current = false;
        // Dismiss the in-app browser if still open
        WebBrowser.dismissAuthSession();
        // Check status with auto-sync enabled
        checkGcalStatus({ autoSync: true });
      }
    });
    return () => sub.remove();
  }, [checkGcalStatus]);

  const handleGcalConnect = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Get the auth URL from Project A
      const res = await api(`/api/public/google-calendar/auth?userId=${userId}&role=midwife`);
      const data = await res.json();
      if (!data?.authUrl) {
        Alert.alert("Fehler", "Authentifizierungs-URL konnte nicht generiert werden.");
        return;
      }

      // 2. Open the OAuth flow
      gcalOAuthInProgress.current = true;
      const redirectUrl = ExpoLinking.createURL("gcal-callback");
      const result = await WebBrowser.openAuthSessionAsync(data.authUrl, redirectUrl);
      gcalOAuthInProgress.current = false;

      if (result.type === "success" && result.url) {
        const parsed = ExpoLinking.parse(result.url);
        if (parsed.queryParams?.gcal === "connected") {
          // Redirect was caught — trigger sync directly
          setGcalConnected(true);
          setGcalSyncing(true);
          try {
            await api("/api/public/google-calendar/midwife-sync", {
              method: "POST",
              body: JSON.stringify({ userId }),
            });
            setGcalLastSyncAt(new Date().toISOString());
          } catch {
            // sync failed silently — calendar is still connected
          } finally {
            setGcalSyncing(false);
          }
        } else if (parsed.queryParams?.gcal === "denied") {
          Alert.alert("Abgebrochen", "Google Kalender Zugriff wurde verweigert.");
        } else if (parsed.queryParams?.gcal === "error") {
          Alert.alert("Fehler", "Verbindung mit Google Kalender fehlgeschlagen.");
        }
      } else {
        // Browser was dismissed (user swiped back, or AppState listener closed it).
        // Status check + auto-sync already handled by the AppState listener.
      }
    } catch (err) {
      gcalOAuthInProgress.current = false;
      console.error("GCal connect error:", err);
      Alert.alert("Fehler", "Verbindung mit Google Kalender fehlgeschlagen.");
    }
  }, [userId]);

  const handleGcalManualSync = useCallback(async () => {
    if (!userId) return;
    setGcalSyncing(true);
    try {
      await api("/api/public/google-calendar/midwife-sync", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setGcalLastSyncAt(new Date().toISOString());
    } catch {
      Alert.alert("Fehler", "Synchronisierung fehlgeschlagen.");
    } finally {
      setGcalSyncing(false);
    }
  }, [userId]);

  const handleGcalDisconnect = useCallback(async () => {
    if (!userId) return;
    Alert.alert(
      "Google Kalender trennen",
      "Alle synchronisierten Termine werden aus Ihrem Google Kalender entfernt. Fortfahren?",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Trennen",
          style: "destructive",
          onPress: async () => {
            try {
              setGcalDisconnecting(true);
              await api("/api/public/google-calendar/disconnect", {
                method: "POST",
                body: JSON.stringify({ userId }),
              });
              setGcalConnected(false);
            } catch {
              Alert.alert("Fehler", "Trennung fehlgeschlagen.");
            } finally {
              setGcalDisconnecting(false);
            }
          },
        },
      ]
    );
  }, [userId]);
  const { data, status, error, refresh } = useMidwifeProfile(userId);

  const fullName = useMemo(() => {
    const p = data?.personalInfo;
    const fn = [p?.firstName, p?.lastName].filter(Boolean).join(" ");
    return fn || p?.username || "—";
  }, [data]);

  const avatar = data?.personalInfo?.profileImage?.url;
  const logo = data?.personalInfo?.logo?.url;

  const services = useMemo(() => {
    const s = data?.services ?? {};
    // Transform map -> array and keep a stable order by code
    return Object.keys(s)
      .sort()
      .map((k) => ({ key: k, ...s[k] }));
  }, [data]);

  const testimonials = data?.testimonials ?? [];
  const faqs = data?.faqs ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.backgroundGray }}
      contentContainerStyle={{ padding: SPACING.lg }}
      refreshControl={
        <RefreshControl refreshing={status === "loading"} onRefresh={refresh} />
      }
    >
      {/* Header / Identity */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Image
            source={{ uri: avatar || "https://placehold.co/200x200?text=Avatar" }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{fullName}</Text>
            {!!data?.personalInfo?.midwifeTitle && (
              <Text style={styles.title}>{data.personalInfo.midwifeTitle}</Text>
            )}
            {!!data?.personalInfo?.slogan && (
              <Text style={styles.slogan}>{data.personalInfo.slogan}</Text>
            )}
          </View>
          <Image
            source={{ uri: logo || "https://placehold.co/120x120?text=Logo" }}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* Contact & Address */}
        <View style={styles.divider} />
        <Row label="E-Mail" value={data?.personalInfo?.email} onPressValue={(v) => Linking.openURL(`mailto:${v}`)} />
        <Row label="Telefon" value={data?.personalInfo?.phone} onPressValue={(v) => Linking.openURL(`tel:${v}`)} />
        <Row
          label="Adresse"
          value={
            data?.personalInfo?.googleAddress?.fullAddress ||
            data?.personalInfo?.address
          }
        />
        <Row label="Serviceradius (km)" value={data?.personalInfo?.serviceRadius} />
        <Row label="Typ" value={data?.midwifeType?.midwifeType} />
      </View>

      {/* About / Statement */}
      {(data?.personalInfo?.about || data?.personalInfo?.personalStatement) && (
        <Card title="Über mich">
          {!!data?.personalInfo?.about && (
            <Text style={styles.p}>{data.personalInfo.about}</Text>
          )}
          {!!data?.personalInfo?.personalStatement && (
            <Text style={[styles.p, { marginTop: 6 }]}>{data.personalInfo.personalStatement}</Text>
          )}
        </Card>
      )}

      {/* Services */}
      {services.length > 0 && (
        <Card title="Leistungen">
          {services.map((s, i) => (
            <View key={s.key} style={[styles.serviceRow, i > 0 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle}>
                  {s.code || s.key} — {s.title || "Leistung"}
                </Text>
                {!!s.description && <Text style={styles.serviceSub}>{s.description}</Text>}
                <Text style={styles.serviceMeta}>
                  {s.serviceType ?? "—"} • {s.duration ?? "—"} • {s.interval ?? "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {!!s.startingAt && <Text style={styles.kv}>{s.startingAt}</Text>}
                {!!s.appointments && <Text style={styles.kv}>Termine: {s.appointments}</Text>}
                {!!s.turnover && <Text style={styles.kv}>€ {s.turnover}</Text>}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Timetable (collapsible-by-day simple render) */}
      {!!data?.identity?.timetable && (
        <Card title="Wöchentlicher Zeitplan">
          {Object.entries(data.identity.timetable).map(([day, conf], i) => (
            <TimetableDay key={day} day={day} slotsMap={conf?.slots ?? {}} first={i === 0} />
          ))}
        </Card>
      )}

      {/* Bank Info */}
      {!!data?.bankInfo && (
        <Card title="Bankinformationen">
          <Row label="Kontoinhaber" value={data.bankInfo.accountHolderName} />
          <Row label="Bank" value={data.bankInfo.bankName} />
          <Row label="Kontonummer" value={data.bankInfo.accountNumber} />
          <Row label="Bankleitzahl" value={data.bankInfo.routingNumber} />
        </Card>
      )}

      {/* More Info */}
      {!!data?.moreInfo && (
        <Card title="Weitere Informationen">
          <Row label="Akupunktur" value={data.moreInfo.acupuncture} />
          <Row label="Erfahrung" value={data.moreInfo.professionalExperience} />
          <Row label="Nachricht" value={data.moreInfo.message} />
          {!!data.moreInfo.supportedPregnancies && (
            <Row label="Unterstützte Schwangerschaften" value={String(data.moreInfo.supportedPregnancies)} />
          )}
        </Card>
      )}

      {/* Social Links */}
      {!!data?.socialLinks && Object.values(data.socialLinks).some(Boolean) && (
        <Card title="Soziale Medien">
          {Object.entries(data.socialLinks).map(([k, v]) =>
            v ? (
              <TouchableOpacity key={k} onPress={() => WebBrowser.openBrowserAsync(v)}>
                <Row label={k[0].toUpperCase() + k.slice(1)} value={v} showChevron />
              </TouchableOpacity>
            ) : null
          )}
        </Card>
      )}

      {/* Google Calendar */}
      <Card title="Google Kalender">
        {gcalLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : gcalSyncing ? (
          <View style={gcalStyles.statusRow}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
            <Text style={gcalStyles.syncingText}>Synchronisiere Termine...</Text>
          </View>
        ) : gcalConnected ? (
          <View>
            {gcalDisconnecting ? (
              <View style={gcalStyles.statusRow}>
                <ActivityIndicator size="small" color={COLORS.error} style={{ marginRight: SPACING.sm }} />
                <Text style={gcalStyles.disconnectingText}>Wird getrennt...</Text>
              </View>
            ) : (
              <>
                <View style={gcalStyles.connectedRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={gcalStyles.connectedText}>Google Kalender verbunden</Text>
                </View>
                {!gcalLastSyncAt && (
                  <TouchableOpacity style={gcalStyles.syncBtn} onPress={handleGcalManualSync}>
                    <Ionicons name="sync-outline" size={18} color={COLORS.buttonPrimaryText} />
                    <Text style={gcalStyles.syncBtnText}>Jetzt synchronisieren</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={gcalStyles.disconnectBtn} onPress={handleGcalDisconnect}>
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                  <Text style={gcalStyles.disconnectText}>Verbindung trennen</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <TouchableOpacity style={gcalStyles.connectBtn} onPress={handleGcalConnect}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.buttonPrimaryText} />
            <Text style={gcalStyles.connectText}>Mit Google Kalender verbinden</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Testimonials (horizontal) */}
      {testimonials.length > 0 && (
        <Card title="Erfahrungsberichte">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={testimonials}
            keyExtractor={(t) => t._id ?? t.name ?? Math.random().toString()}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => (
              <View style={styles.testimonial}>
                <Image
                  source={{ uri: item.profileImage?.url || "https://placehold.co/120x120?text=•" }}
                  style={styles.testimonialImg}
                />
                <Text style={styles.testimonialName}>{item.name ?? "—"}</Text>
                {!!item.designation && <Text style={styles.testimonialRole}>{item.designation}</Text>}
                {!!item.description && <Text style={styles.pSmall}>{item.description}</Text>}
              </View>
            )}
          />
        </Card>
      )}

     

      {/* Loading / Error fallback */}
      {status === "loading" && !data && (
        <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>{de.common.loading}</Text>
      )}
      {status === "error" && (
        <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>{error ?? "Profil konnte nicht geladen werden"}</Text>
      )}
    </ScrollView>
  );
}

/* ---------- small UI bits ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPressValue,
  showChevron,
}: {
  label: string;
  value?: string | number | null;
  onPressValue?: (v: string) => void;
  showChevron?: boolean;
}) {
  const val = value == null ? "—" : String(value);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TouchableOpacity
        style={{ flex: 1, alignItems: "flex-end" }}
        disabled={!onPressValue}
        onPress={() => onPressValue?.(val)}
      >
        <Text style={[styles.rowValue, onPressValue && styles.link]} numberOfLines={2}>
          {val}
        </Text>
        {showChevron && <Text style={styles.chev}>›</Text>}
      </TouchableOpacity>
    </View>
  );
}

function TimetableDay({
  day,
  slotsMap,
  first,
}: {
  day: string;
  slotsMap: Record<string, { startTime: string; endTime: string }[]>;
  first?: boolean;
}) {
  const [open, setOpen] = useState(first ?? false);
  const codes = Object.keys(slotsMap);
  return (
    <View style={[styles.ttDay, !first && styles.rowDivider]}>
      <TouchableOpacity onPress={() => setOpen((s) => !s)} style={styles.ttHeader}>
        <Text style={styles.ttDayTitle}>{day}</Text>
        <Text style={styles.chev}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: SPACING.xs }}>
          {codes.length === 0 && <Text style={styles.dimSmall}>Keine Slots</Text>}
          {codes.map((code) => (
            <View key={code} style={{ marginBottom: 8 }}>
              <Text style={styles.ttCode}>{code}</Text>
              <Text style={styles.ttSlots}>
                {slotsMap[code].map((s) => `${s.startTime}–${s.endTime}`).join("  ·  ")}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}



/* ---------- styles ---------- */

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#eee" },
  logo: { width: 64, height: 64 },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  title: { color: COLORS.primary, marginTop: SPACING.xs, fontWeight: "700" },
  slogan: { color: COLORS.textSecondary, marginTop: SPACING.xs },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: SPACING.sm },
  p: { color: COLORS.text, lineHeight: 20 },
  pSmall: { color: COLORS.textSecondary, lineHeight: 18, marginTop: SPACING.xs },
  dimSmall: { color: COLORS.textSecondary, fontSize: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  rowLabel: { width: 150, color: COLORS.textSecondary, fontWeight: "700" },
  rowValue: { color: COLORS.text, textAlign: "right" },
  link: { color: COLORS.primary, fontWeight: "700" },
  chev: { color: COLORS.textSecondary, marginLeft: SPACING.xs },

  serviceRow: { paddingVertical: SPACING.sm, flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  serviceTitle: { color: COLORS.text, fontWeight: "800" },
  serviceSub: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  serviceMeta: { color: COLORS.primary, marginTop: SPACING.xs, fontWeight: "700" },
  kv: { color: COLORS.textSecondary },

  ttDay: { paddingVertical: SPACING.sm },
  ttHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ttDayTitle: { fontWeight: "800", color: COLORS.text },
  ttCode: { color: COLORS.primary, fontWeight: "800", marginTop: SPACING.xs },
  ttSlots: { color: COLORS.text, marginTop: SPACING.xs },

  testimonial: {
    width: 220,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  testimonialImg: { width: 48, height: 48, borderRadius: 24, marginBottom: SPACING.xs, backgroundColor: "#eee" },
  testimonialName: { fontWeight: "800", color: COLORS.text },
  testimonialRole: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.xs },
});

const gcalStyles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  syncingText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  disconnectingText: {
    color: COLORS.error,
    fontWeight: "600",
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  connectedText: {
    color: COLORS.success,
    fontWeight: "700",
    fontSize: 15,
  },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  disconnectText: {
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 14,
  },
  connectBtn: {
    backgroundColor: COLORS.buttonPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  connectText: {
    color: COLORS.buttonPrimaryText,
    fontWeight: "700",
    fontSize: 15,
  },
  syncBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  syncBtnText: {
    color: COLORS.buttonPrimaryText,
    fontWeight: "700",
    fontSize: 14,
  },
});
