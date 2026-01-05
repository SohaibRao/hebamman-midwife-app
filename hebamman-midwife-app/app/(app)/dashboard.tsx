import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ---- Leads hook & helpers ----
import { Lead, leadAddress, leadDisplayDate, useLeads } from "@/hooks/useLeads";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { api } from "@/lib/api";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";

// Service colors
const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": COLORS.serviceA1A2,
  B1: COLORS.serviceB1,
  B2: COLORS.serviceB2,
  E1: COLORS.serviceE1,
  C1: COLORS.serviceC1,
  C2: COLORS.serviceC2,
  D1: COLORS.serviceD1,
  D2: COLORS.serviceD2,
  F1: COLORS.serviceF1,
};

const SERVICE_NAMES: Record<string, string> = {
  "A1/A2": de.serviceCodes["A1/A2"],
  B1: de.serviceCodes.B1,
  B2: de.serviceCodes.B2,
  E1: de.serviceCodes.E1,
  C1: de.serviceCodes.C1,
  C2: de.serviceCodes.C2,
  D1: de.serviceCodes.D1,
  D2: de.serviceCodes.D2,
  F1: de.serviceCodes.F1,
};

const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.textSecondary;

// Types
type Patient = {
  _id: string;
  userId: string;
  midwifeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  clientStatus: "pending" | "converted" | "cancelled";
  status: "pending" | "active" | "cancelled";
};

type MonthKey = string;

type Apt = {
  midwifeId: string;
  clientId?: string;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  serviceCode: string;
};

type MonthlyBucket = {
  ["A1/A2"]?: Apt[];
  B1?: Apt[];
  B2?: Apt[];
  E1?: Apt[];
  C1?: Apt[];
  C2?: Apt[];
  D1?: Apt[];
  D2?: Apt[];
  F1?: Apt[];
};

type MonthlySuccess = {
  success: true;
  message?: string;
  data: Record<MonthKey, MonthlyBucket>;
  meta?: { monthsFound?: number; totalDocuments?: number };
};

type UiApt = Apt & { serviceCode: string; dateObj: Date; clientName?: string };

type UserDetail = {
  name: string;
  email: string;
  role: string;
};

// Helpers
const toDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((n) => parseInt(n, 10));
  return new Date(yyyy, mm - 1, dd);
};

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function fetchMonthlyOnce(
  url: string,
  payload: { midwifeId: string; clientET: string }
): Promise<MonthlySuccess | null> {
  try {
    const res = await api(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await readJsonSafe<MonthlySuccess | { success: false; message: string }>(res);
    if (!json || (json as any).success !== true) return null;
    const ok = json as MonthlySuccess;
    if (!ok.data || Object.keys(ok.data).length === 0) return null;
    return ok;
  } catch {
    return null;
  }
}

async function fetchUserDetails(ids: string[]): Promise<Record<string, UserDetail>> {
  try {
    const res = await api("/api/public/user/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = await readJsonSafe<{ success: boolean; data: Record<string, UserDetail> }>(res);
    if (json?.success && json.data) {
      return json.data;
    }
    return {};
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {};
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { 
    user, 
    logout, 
    isSuperuser, 
    isManagingMidwife, 
    selectedMidwife, 
    clearSelectedMidwife,
    getEffectiveUserId 
  } = useAuth();

  // Get profile by userId (for regular midwife) or by selected midwife's userId (for superuser)
  const effectiveUserId = getEffectiveUserId();
  const { data: profile, status: pStatus } = useMidwifeProfile(effectiveUserId);
  const midwifeId = profile?._id;

  // Fetch leads
  const { upcoming, loading: leadsLoading } = useLeads(midwifeId);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const upcomingLeads5 = React.useMemo(() => upcoming.slice(0, 5), [upcoming]);

  // Fetch patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!midwifeId) return;
    
    setLoadingPatients(true);
    try {
      const res = await api(`/api/public/midwifeBooking/${midwifeId}`);
      const json = await res.json();
      
      if (json.success) {
        setPatients(json.data || []);
      }
    } catch (e: any) {
      console.error("Error fetching patients:", e);
    } finally {
      setLoadingPatients(false);
    }
  }, [midwifeId]);

  useEffect(() => {
    if (midwifeId) {
      fetchPatients();
    }
  }, [midwifeId, fetchPatients]);

  // Active patients count (converted status)
  const activePatientsCount = useMemo(() => {
    return patients.filter(p => p.clientStatus === "converted").length;
  }, [patients]);

  // Latest 5 active patients
  const activePatients5 = useMemo(() => {
    return patients
      .filter(p => p.clientStatus === "converted")
      .slice(0, 5);
  }, [patients]);

  // Fetch appointments
  const clientET = useMemo(() => new Date(), []);
  const [appointments, setAppointments] = useState<UiApt[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});

  const fetchAppointments = useCallback(async () => {
    if (!midwifeId) return;
    
    setLoadingAppointments(true);
    try {
      const payload = { midwifeId, clientET: clientET.toISOString() };
      
      let ok =
        (await fetchMonthlyOnce(`/api/public/PostBirthAppointments/monthly-view`, payload)) ||
        (await fetchMonthlyOnce(`/app/api/public/PostBirthAppointments/monthly-view`, payload));
      
      if (!ok) {
        setAppointments([]);
        return;
      }

      // Extract all appointments
      const allApts: UiApt[] = [];
      Object.values(ok.data || {}).forEach((bucket) => {
        const add = (list: Apt[] | undefined, svc: string) => {
          (list ?? []).forEach((a) => 
            allApts.push({ ...a, serviceCode: svc, dateObj: toDate(a.appointmentDate) })
          );
        };
        add(bucket["A1/A2"], "A1/A2");
        add(bucket.B1, "B1");
        add(bucket.B2, "B2");
        add(bucket.E1, "E1");
        add(bucket.C1, "C1");
        add(bucket.C2, "C2");
        add(bucket.D1, "D1");
        add(bucket.D2, "D2");
        add(bucket.F1, "F1");
      });

      // Extract unique client IDs
      const clientIds = new Set<string>();
      allApts.forEach((a) => {
        if (a.clientId) clientIds.add(a.clientId);
      });

      // Fetch user details
      if (clientIds.size > 0) {
        const details = await fetchUserDetails(Array.from(clientIds));
        setUserDetails(details);
        
        // Add client names to appointments
        allApts.forEach(apt => {
          if (apt.clientId && details[apt.clientId]) {
            apt.clientName = details[apt.clientId].name;
          }
        });
      }

      // Sort by date and time
      allApts.sort((a, b) => {
        const d = a.dateObj.getTime() - b.dateObj.getTime();
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });

      setAppointments(allApts);
    } catch (e: any) {
      console.error("Error fetching appointments:", e);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [midwifeId, clientET]);

  useEffect(() => {
    if (midwifeId) {
      fetchAppointments();
    }
  }, [midwifeId, fetchAppointments]);

  // Get upcoming 5 appointments (future dates only)
  const upcomingApp5 = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return appointments
      .filter(apt => apt.dateObj >= now)
      .slice(0, 5);
  }, [appointments]);

  const navigateToPatient = (patient: Patient) => {
    router.push({
      pathname: "/(app)/patients/appointments" as any,
      params: {
        clientId: patient.userId,
        midwifeId: midwifeId,
        patientName: patient.fullName,
      }
    });
  };

  // Handle switch midwife (for superuser)
  const handleSwitchMidwife = async () => {
    await clearSelectedMidwife();
    router.replace("/(admin)/midwife-selection");
  };

  // Get display name for welcome message
  const getWelcomeName = () => {
    if (isSuperuser && isManagingMidwife) {
      return selectedMidwife?.name || "Admin";
    }
    return user?.username ?? "Midwife";
  };

  // Get today's date in German format
  const getTodayDate = () => {
    const now = new Date();
    const day = now.toLocaleDateString('de-DE', { weekday: 'long' });
    const date = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${day.charAt(0).toUpperCase() + day.slice(1)}, ${date}`;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: SPACING.lg }}>
      {/* Admin Banner - Show when superuser is managing a midwife */}
      {isSuperuser && isManagingMidwife && (
        <View style={styles.adminBanner}>
          <View style={styles.adminBannerContent}>
            <View style={styles.adminBannerLeft}>
              <Text style={styles.adminBannerLabel}>{de.admin.managingPracticeOf}</Text>
              <Text style={styles.adminBannerName}>{selectedMidwife?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.switchMidwifeBtn}
              onPress={handleSwitchMidwife}
            >
              <Text style={styles.switchMidwifeBtnText}>{de.dashboard.switchBack}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Greeting */}
      <View style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.h1}>
          {de.dashboard.greeting}, {getWelcomeName()}
        </Text>
        <Text style={styles.dateText}>{getTodayDate()}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={styles.statIcon}>👥</Text>
          {loadingPatients ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{activePatientsCount}</Text>
          )}
          <Text style={styles.statLabel}>{de.dashboard.stats.activePatients}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: COLORS.infoLight }]}>
          <Text style={styles.statIcon}>📋</Text>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{de.dashboard.stats.openRequests}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={styles.statIcon}>👶</Text>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{de.dashboard.stats.birthsThisMonth}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: COLORS.warningLight }]}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.warningDark} />
          {loadingAppointments ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{upcomingApp5.length}</Text>
          )}
          <Text style={styles.statLabel}>{de.dashboard.stats.appointmentsToday}</Text>
        </View>
      </View>

      {/* Today's Appointments */}
      <SectionHeader
        title={de.dashboard.todaysAppointments}
        action={
          <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{de.dashboard.viewAll}</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {loadingAppointments && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        {!loadingAppointments && upcomingApp5.length === 0 && (
          <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.dashboard.noAppointments}</Text>
        )}
        {!loadingAppointments &&
          upcomingApp5.map((a, i) => (
            <View key={`${a.serviceCode}-${a.appointmentId}`} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={[styles.dot, { backgroundColor: codeColor(a.serviceCode) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {a.serviceCode} • {SERVICE_NAMES[a.serviceCode] || a.serviceCode}
                </Text>
                <Text style={styles.rowSub}>{a.clientName || "Patient"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.when}>{fmtDateShort(a.dateObj)}</Text>
                <Text style={styles.slot}>{a.startTime}–{a.endTime} · {a.duration}{de.appointments.minutes}</Text>
              </View>
            </View>
          ))}
      </View>

      {/* A1/A2 Consultation (Leads) */}
      <SectionHeader
        title="A1/A2 Beratungen (Leads)"
        action={
          <Link href={{ pathname: "/(app)/leads" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{de.dashboard.viewAll}</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {leadsLoading && <Text style={{ color: COLORS.textSecondary }}>{de.common.loading}</Text>}
        {!leadsLoading && upcomingLeads5.length === 0 && (
          <Text style={{ color: COLORS.textSecondary }}>Keine bevorstehenden Leads.</Text>
        )}
        {!leadsLoading &&
          upcomingLeads5.map((lead, i) => (
            <Pressable
              key={lead._id}
              onPress={() => setSelectedLead(lead)}
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{lead.fullName}</Text>
                <Text style={styles.rowSub}>{lead.email} · {lead.phoneNumber}</Text>
                <Text style={styles.rowSubSmall}>{leadAddress(lead)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.when}>{leadDisplayDate(lead)}</Text>
                <Text style={styles.slot}>{lead.selectedSlot ?? "—"}</Text>
              </View>
            </Pressable>
          ))}
      </View>

      {/* Active Patients (Latest 5) */}
      <SectionHeader
        title={de.patients.title}
        action={
          <Link href={{ pathname: "/(app)/patients" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{de.dashboard.viewAll}</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {loadingPatients && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        {!loadingPatients && activePatients5.length === 0 && (
          <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.patients.noPatients}</Text>
        )}
        {!loadingPatients &&
          activePatients5.map((patient, i) => (
            <TouchableOpacity
              key={patient._id}
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{patient.fullName}</Text>
                <Text style={styles.rowSub}>{patient.email}</Text>
                <Text style={styles.rowSubSmall}>{patient.phoneNumber}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{de.patients.status.schwanger}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
      </View>

      {/* Quick Actions */}
      <View style={{ marginTop: SPACING.lg }}>
        <Text style={styles.sectionTitle}>{de.dashboard.quickActions}</Text>
        <View style={styles.quickActionsGrid}>
          <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
            <TouchableOpacity style={styles.quickActionBtn}>
              <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
              <Text style={styles.quickActionText}>{de.dashboard.quickActionButtons.createAppointment}</Text>
            </TouchableOpacity>
          </Link>
          <Link href={{ pathname: "/(app)/patients" } as any} asChild>
            <TouchableOpacity style={styles.quickActionBtn}>
              <Ionicons name="person-outline" size={28} color={COLORS.primary} />
              <Text style={styles.quickActionText}>{de.dashboard.quickActionButtons.addPatient}</Text>
            </TouchableOpacity>
          </Link>
          <Link href={{ pathname: "/(app)/requests" } as any} asChild>
            <TouchableOpacity style={styles.quickActionBtn}>
              <Ionicons name="document-text-outline" size={28} color={COLORS.primary} />
              <Text style={styles.quickActionText}>{de.dashboard.quickActionButtons.checkRequests}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Lead details modal */}
      {selectedLead && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedLead(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelectedLead(null)}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lead-Details</Text>
                <TouchableOpacity onPress={() => setSelectedLead(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Detail label={de.common.name} value={selectedLead.fullName} />
              <Detail label={de.common.email} value={selectedLead.email} />
              <Detail label={de.common.phone} value={selectedLead.phoneNumber} />
              <Detail label={de.common.date} value={leadDisplayDate(selectedLead)} />
              <Detail label="Zeitfenster" value={selectedLead.selectedSlot ?? "—"} />
              <Detail label="Versicherung" value={`${selectedLead.insuranceType ?? "—"} (${selectedLead.insuranceCompany ?? "—"})`} />
              <Detail label={de.common.address} value={leadAddress(selectedLead)} />
              <Detail label={de.common.status} value={selectedLead.status ?? "pending"} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ScrollView>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: SPACING.sm }}>
      <Text style={{ width: 110, color: COLORS.textSecondary, fontWeight: "700" }}>{label}:</Text>
      <Text style={{ flex: 1, color: COLORS.text }}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Admin Banner Styles
  adminBanner: {
    backgroundColor: COLORS.infoLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  adminBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminBannerLeft: {
    flex: 1,
  },
  adminBannerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.info,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adminBannerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 2,
  },
  switchMidwifeBtn: {
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  switchMidwifeBtnText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: 14,
  },

  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  dateText: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    flex: 1,
    minWidth: '47%',
    alignItems: "center",
    ...SHADOWS.sm,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    marginVertical: SPACING.xs,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },

  sectionHeader: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  linkBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  linkBtnText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: 13,
  },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.sm,
    marginBottom: SPACING.lg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowTitle: {
    fontWeight: "700",
    color: COLORS.text,
    fontSize: 15,
  },
  rowSub: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  rowSubSmall: {
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  when: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  slot: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.xs,
  },

  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.statusSchwanger,
  },
  badgeText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: 11,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 620,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
});