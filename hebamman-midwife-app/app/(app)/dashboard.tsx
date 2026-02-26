import { useAuth } from "@/context/AuthContext";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
import { PhoneBooking, usePhoneBookings, phoneBookingDisplayDate, phoneBookingTimeRange } from "@/hooks/usePhoneBookings";
import { PrivateServiceBooking, usePrivateServiceBookings, privateServiceDisplayDate, privateServiceTimeRange, privateServiceFullName } from "@/hooks/usePrivateServiceBookings";
import { api } from "@/lib/api";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";
import AppointmentCard from "@/components/appointments/AppointmentCard";

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
  G: COLORS.serviceG,
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
  G: de.serviceCodes.G,
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

  // Fetch phone bookings (G slots)
  const { upcoming: upcomingPhoneBookings, loading: phoneBookingsLoading } = usePhoneBookings(midwifeId);
  const [phoneBookingsExpanded, setPhoneBookingsExpanded] = useState(false);
  const [selectedPhoneBooking, setSelectedPhoneBooking] = useState<PhoneBooking | null>(null);

  // Fetch private service bookings
  const { upcoming: upcomingPrivateBookings, loading: privateBookingsLoading } = usePrivateServiceBookings(midwifeId);
  const [privateBookingsExpanded, setPrivateBookingsExpanded] = useState(false);
  const [selectedPrivateBooking, setSelectedPrivateBooking] = useState<PrivateServiceBooking | null>(null);

  // Expandable sections state
  const [appointmentsExpanded, setAppointmentsExpanded] = useState(false);
  const [leadsExpanded, setLeadsExpanded] = useState(false);
  const [patientsExpanded, setPatientsExpanded] = useState(false);

  // Fetch patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!midwifeId) return;

    setLoadingPatients(true);
    try {
      const res = await api(`/api/public/midwifeBooking/${midwifeId}`);
      const json = await readJsonSafe<{ success?: boolean; data?: Patient[] }>(res);

      if (json?.success) {
        setPatients(json.data || []);
      }
    } catch (e: any) {
      console.error("Error fetching patients:", e);
    } finally {
      setLoadingPatients(false);
    }
  }, [midwifeId]);

  // Fetch open requests
  const [openRequestsCount, setOpenRequestsCount] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchOpenRequests = useCallback(async () => {
    if (!midwifeId) return;

    setLoadingRequests(true);
    try {
      const res = await api(`/api/public/clientRequest?midwifeId=${midwifeId}`);
      const json = await readJsonSafe<{ success?: boolean; data?: any[] }>(res);

      if (json?.success && json.data) {
        const pendingCount = json.data.filter((r: any) => r.status === "pending").length;
        setOpenRequestsCount(pendingCount);
      }
    } catch (e: any) {
      console.error("Error fetching requests:", e);
    } finally {
      setLoadingRequests(false);
    }
  }, [midwifeId]);

  useEffect(() => {
    if (midwifeId) {
      fetchPatients();
      fetchOpenRequests();
    }
  }, [midwifeId, fetchPatients, fetchOpenRequests]);

  // Active patients count (converted status)
  const activePatientsCount = useMemo(() => {
    return patients.filter(p => p.clientStatus === "converted").length;
  }, [patients]);

  // Active patients to display (expandable)
  const displayedActivePatients = useMemo(() => {
    const activePatients = patients.filter(p => p.clientStatus === "converted");
    const result = patientsExpanded ? activePatients.slice(0, 5) : activePatients.slice(0, 2);
    console.log('displayedActivePatients recalculated:', {
      totalActive: activePatients.length,
      expanded: patientsExpanded,
      displayedCount: result.length
    });
    return result;
  }, [patients, patientsExpanded]);

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

  // Get upcoming appointments count
  const upcomingAppointmentsCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return appointments.filter(apt => apt.dateObj >= now).length;
  }, [appointments]);

  // Get upcoming appointments (future dates only, expandable)
  const displayedAppointments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingAppts = appointments.filter(apt => apt.dateObj >= now);
    const result = appointmentsExpanded ? upcomingAppts.slice(0, 5) : upcomingAppts.slice(0, 2);
    console.log('displayedAppointments recalculated:', {
      totalUpcoming: upcomingAppts.length,
      expanded: appointmentsExpanded,
      displayedCount: result.length
    });
    return result;
  }, [appointments, appointmentsExpanded]);

  // Get upcoming phone bookings to display (expandable)
  const displayedPhoneBookings = useMemo(() => {
    return phoneBookingsExpanded ? upcomingPhoneBookings.slice(0, 5) : upcomingPhoneBookings.slice(0, 2);
  }, [upcomingPhoneBookings, phoneBookingsExpanded]);

  // Get upcoming private service bookings to display (expandable)
  const displayedPrivateBookings = useMemo(() => {
    return privateBookingsExpanded ? upcomingPrivateBookings.slice(0, 5) : upcomingPrivateBookings.slice(0, 2);
  }, [upcomingPrivateBookings, privateBookingsExpanded]);

  // Get upcoming leads to display (expandable)
  const displayedLeads = useMemo(() => {
    const result = leadsExpanded ? upcoming.slice(0, 5) : upcoming.slice(0, 2);
    console.log('displayedLeads recalculated:', {
      totalLeads: upcoming.length,
      expanded: leadsExpanded,
      displayedCount: result.length
    });
    return result;
  }, [upcoming, leadsExpanded]);

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
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => router.push("/(app)/patients" as any)}
        >
          <Text style={styles.statIcon}>👥</Text>
          {loadingPatients ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{activePatientsCount}</Text>
          )}
          <Text style={styles.statLabel}>{de.dashboard.stats.activePatients}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => router.push("/(app)/requests" as any)}
        >
          <Text style={styles.statIcon}>📋</Text>
          {loadingRequests ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{openRequestsCount}</Text>
          )}
          <Text style={styles.statLabel}>{de.dashboard.stats.openRequests}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => router.push("/(app)/phone-bookings" as any)}
        >
          <Ionicons name="call-outline" size={32} color={COLORS.serviceG} />
          {phoneBookingsLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{upcomingPhoneBookings.length}</Text>
          )}
          <Text style={styles.statLabel}>{de.phoneBookings.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => router.push("/(app)/appointments" as any)}
        >
          <Ionicons name="calendar-outline" size={32} color={COLORS.warningDark} />
          {loadingAppointments ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{upcomingAppointmentsCount}</Text>
          )}
          <Text style={styles.statLabel}>{de.dashboard.stats.appointmentsToday}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}
          onPress={() => router.push("/(app)/private-services" as any)}
        >
          <Ionicons name="briefcase-outline" size={32} color={COLORS.servicePrivate} />
          {privateBookingsLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.statValue}>{upcomingPrivateBookings.length}</Text>
          )}
          <Text style={styles.statLabel}>{de.privateServices.title}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={{ marginTop: SPACING.md, marginBottom: SPACING.lg }}>
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
      <View style={styles.appointmentsContainer}>
        {loadingAppointments && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        {!loadingAppointments && displayedAppointments.length === 0 && (
          <View style={styles.listCard}>
            <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.dashboard.noAppointments}</Text>
          </View>
        )}
        {!loadingAppointments && displayedAppointments.length > 0 && (
          <>
            {displayedAppointments.map((a) => (
              <AppointmentCard
                key={`${a.serviceCode}-${a.appointmentId}`}
                appointment={a}
                patientName={a.clientName || "Patient"}
                onPressDetails={() => {
                  router.push({
                    pathname: "/(app)/appointments" as any,
                  });
                }}
                onPressEdit={() => {
                  router.push({
                    pathname: "/(app)/appointments" as any,
                  });
                }}
              />
            ))}
            <View style={styles.listCard}>
              <View style={styles.expandButtonContainer}>
                {!appointmentsExpanded && upcomingAppointmentsCount > 2 && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => {
                      console.log('Expanding appointments');
                      setAppointmentsExpanded(true);
                    }}
                  >
                    <Text style={styles.expandButtonText}>Mehr anzeigen ({upcomingAppointmentsCount - 2} weitere)</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                {appointmentsExpanded && (
                  <View>
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => {
                        console.log('Collapsing appointments');
                        setAppointmentsExpanded(false);
                      }}
                    >
                      <Text style={styles.expandButtonText}>Weniger anzeigen</Text>
                      <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Link href={{ pathname: "/(app)/appointments" } as any} asChild>
                      <TouchableOpacity style={[styles.expandButton, { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, paddingVertical: SPACING.md }]}>
                        <Text style={[styles.expandButtonText, { fontWeight: "800" }]}>Alle Termine anzeigen</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Telefon-Termine (Phone Bookings / G Slots) */}
      <SectionHeader
        title={de.phoneBookings.title}
        action={
          <Link href={{ pathname: "/(app)/phone-bookings" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{de.phoneBookings.viewAll}</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {phoneBookingsLoading && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        {!phoneBookingsLoading && displayedPhoneBookings.length === 0 && (
          <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.phoneBookings.noUpcoming}</Text>
        )}
        {!phoneBookingsLoading && displayedPhoneBookings.length > 0 && (
          <>
            {displayedPhoneBookings.map((booking, i) => {
              const time = phoneBookingTimeRange(booking);
              return (
                <Pressable
                  key={booking._id}
                  onPress={() => setSelectedPhoneBooking(booking)}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                >
                  <View style={styles.phoneBookingIcon}>
                    <Ionicons name="call" size={18} color={COLORS.serviceG} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{booking.fullName}</Text>
                    <Text style={styles.rowSub}>{booking.email}{booking.phone ? ` · ${booking.phone}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.when, { color: COLORS.serviceG }]}>{phoneBookingDisplayDate(booking)}</Text>
                    <Text style={styles.slot}>{time.start} – {time.end}</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.expandButtonContainer}>
              {!phoneBookingsExpanded && upcomingPhoneBookings.length > 2 && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setPhoneBookingsExpanded(true)}
                >
                  <Text style={styles.expandButtonText}>Mehr anzeigen ({upcomingPhoneBookings.length - 2} weitere)</Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {phoneBookingsExpanded && (
                <View>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setPhoneBookingsExpanded(false)}
                  >
                    <Text style={styles.expandButtonText}>Weniger anzeigen</Text>
                    <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Link href={{ pathname: "/(app)/phone-bookings" } as any} asChild>
                    <TouchableOpacity style={[styles.expandButton, { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, paddingVertical: SPACING.md }]}>
                      <Text style={[styles.expandButtonText, { fontWeight: "800" }]}>Alle Telefon-Termine anzeigen</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Privatleistungen (Private Service Bookings) */}
      <SectionHeader
        title={de.privateServices.title}
        action={
          <Link href={{ pathname: "/(app)/private-services" } as any} asChild>
            <TouchableOpacity style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>{de.privateServices.viewAll}</Text>
            </TouchableOpacity>
          </Link>
        }
      />
      <View style={styles.listCard}>
        {privateBookingsLoading && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        {!privateBookingsLoading && displayedPrivateBookings.length === 0 && (
          <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.privateServices.noUpcoming}</Text>
        )}
        {!privateBookingsLoading && displayedPrivateBookings.length > 0 && (
          <>
            {displayedPrivateBookings.map((booking, i) => {
              const time = privateServiceTimeRange(booking);
              const fullName = privateServiceFullName(booking);
              const isCourse = booking.bookingType === "course";
              return (
                <Pressable
                  key={booking._id}
                  onPress={() => setSelectedPrivateBooking(booking)}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                >
                  <View style={styles.privateBookingIcon}>
                    <Ionicons name="briefcase" size={18} color={COLORS.servicePrivate} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{booking.serviceName}</Text>
                    <Text style={styles.rowSub}>{fullName}{booking.email ? ` \u00B7 ${booking.email}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.when, { color: COLORS.servicePrivate }]}>{privateServiceDisplayDate(booking)}</Text>
                    {isCourse ? (
                      <Text style={styles.slot}>{booking.courseSessions?.length || 0}x {de.privateServices.sessions}</Text>
                    ) : (
                      <Text style={styles.slot}>{time.start} \u2013 {time.end}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.expandButtonContainer}>
              {!privateBookingsExpanded && upcomingPrivateBookings.length > 2 && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setPrivateBookingsExpanded(true)}
                >
                  <Text style={styles.expandButtonText}>Mehr anzeigen ({upcomingPrivateBookings.length - 2} weitere)</Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {privateBookingsExpanded && (
                <View>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setPrivateBookingsExpanded(false)}
                  >
                    <Text style={styles.expandButtonText}>Weniger anzeigen</Text>
                    <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Link href={{ pathname: "/(app)/private-services" } as any} asChild>
                    <TouchableOpacity style={[styles.expandButton, { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, paddingVertical: SPACING.md }]}>
                      <Text style={[styles.expandButtonText, { fontWeight: "800" }]}>Alle Privatleistungen anzeigen</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              )}
            </View>
          </>
        )}
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
        {!leadsLoading && displayedLeads.length === 0 && (
          <Text style={{ color: COLORS.textSecondary }}>Keine bevorstehenden Leads.</Text>
        )}
        {!leadsLoading && displayedLeads.length > 0 && (
          <>
            {displayedLeads.map((lead, i) => (
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
            <View style={styles.expandButtonContainer}>
              {!leadsExpanded && upcoming.length > 2 && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => {
                    console.log('Expanding leads');
                    setLeadsExpanded(true);
                  }}
                >
                  <Text style={styles.expandButtonText}>Mehr anzeigen ({upcoming.length - 2} weitere)</Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {leadsExpanded && (
                <View>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => {
                      console.log('Collapsing leads');
                      setLeadsExpanded(false);
                    }}
                  >
                    <Text style={styles.expandButtonText}>Weniger anzeigen</Text>
                    <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Link href={{ pathname: "/(app)/leads" } as any} asChild>
                    <TouchableOpacity style={[styles.expandButton, { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, paddingVertical: SPACING.md }]}>
                      <Text style={[styles.expandButtonText, { fontWeight: "800" }]}>Alle Leads anzeigen</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              )}
            </View>
          </>
        )}
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
        {!loadingPatients && displayedActivePatients.length === 0 && (
          <Text style={{ color: COLORS.textSecondary, paddingVertical: 12 }}>{de.patients.noPatients}</Text>
        )}
        {!loadingPatients && displayedActivePatients.length > 0 && (
          <>
            {displayedActivePatients.map((patient, i) => (
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
            <View style={styles.expandButtonContainer}>
              {!patientsExpanded && activePatientsCount > 2 && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => {
                    console.log('Expanding patients');
                    setPatientsExpanded(true);
                  }}
                >
                  <Text style={styles.expandButtonText}>Mehr anzeigen ({activePatientsCount - 2} weitere)</Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {patientsExpanded && (
                <View>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => {
                      console.log('Collapsing patients');
                      setPatientsExpanded(false);
                    }}
                  >
                    <Text style={styles.expandButtonText}>Weniger anzeigen</Text>
                    <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Link href={{ pathname: "/(app)/patients" } as any} asChild>
                    <TouchableOpacity style={[styles.expandButton, { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm, paddingVertical: SPACING.md }]}>
                      <Text style={[styles.expandButtonText, { fontWeight: "800" }]}>Alle Patienten anzeigen</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              )}
            </View>
          </>
        )}
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
      {/* Private service booking details modal */}
      {selectedPrivateBooking && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPrivateBooking(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelectedPrivateBooking(null)}>
            <Pressable style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{de.privateServices.details}</Text>
                  <TouchableOpacity onPress={() => setSelectedPrivateBooking(null)}>
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.privateBookingModalBadge}>
                  <Ionicons name="briefcase" size={16} color={COLORS.servicePrivate} />
                  <Text style={{ color: COLORS.servicePrivate, fontWeight: "700", fontSize: 14 }}>
                    {selectedPrivateBooking.bookingType === "course" ? de.privateServices.bookingTypeCourse : de.privateServices.bookingTypeSingle}
                  </Text>
                </View>
                <Detail label={de.privateServices.serviceName} value={selectedPrivateBooking.serviceName} />
                <Detail label={de.common.name} value={privateServiceFullName(selectedPrivateBooking)} />
                <Detail label={de.common.email} value={selectedPrivateBooking.email} />
                {selectedPrivateBooking.phone && (
                  <Detail label={de.common.phone} value={selectedPrivateBooking.phone} />
                )}
                <Detail
                  label={de.privateServices.serviceType}
                  value={selectedPrivateBooking.serviceType === "In persona" ? de.privateServices.typeInPersona : de.privateServices.typeVideocall}
                />
                <Detail
                  label={de.privateServices.serviceMode}
                  value={selectedPrivateBooking.serviceMode === "Individual" ? de.privateServices.modeIndividual : de.privateServices.modeGroup}
                />
                <Detail label={de.privateServices.duration} value={`${selectedPrivateBooking.duration} ${de.privateServices.minutes}`} />
                <Detail label={de.privateServices.price} value={`${(parseFloat(String(selectedPrivateBooking.price ?? '')) || 0).toFixed(2)} \u20AC`} />
                {selectedPrivateBooking.bookingType === "single" && (
                  <>
                    <Detail label={de.common.date} value={privateServiceDisplayDate(selectedPrivateBooking)} />
                    <Detail label={de.privateServices.timeSlot} value={selectedPrivateBooking.selectedSlot?.replace("-", " \u2013 ") || "\u2014"} />
                  </>
                )}
                {selectedPrivateBooking.bookingType === "course" && selectedPrivateBooking.courseSessions && selectedPrivateBooking.courseSessions.length > 0 && (
                  <View style={{ marginTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm }}>
                      {de.privateServices.sessions} ({selectedPrivateBooking.courseSessions.length})
                    </Text>
                    {selectedPrivateBooking.courseSessions.map((session, idx) => (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: SPACING.xs, gap: SPACING.sm }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#f5f3ff", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.servicePrivate }}>{session.sessionNumber}</Text>
                        </View>
                        <Text style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>{session.day}, {session.date}</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{session.startTime} {"\u2013"} {session.endTime}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Detail label={de.common.status} value={selectedPrivateBooking.status} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
      {/* Phone booking details modal */}
      {selectedPhoneBooking && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPhoneBooking(null)}>
          <Pressable style={styles.overlay} onPress={() => setSelectedPhoneBooking(null)}>
            <Pressable style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{de.phoneBookings.details}</Text>
                <TouchableOpacity onPress={() => setSelectedPhoneBooking(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.phoneBookingModalBadge}>
                <Ionicons name="call" size={16} color={COLORS.serviceG} />
                <Text style={{ color: COLORS.serviceG, fontWeight: "700", fontSize: 14 }}>{de.phoneBookings.phoneConsultation}</Text>
              </View>
              <Detail label={de.common.name} value={selectedPhoneBooking.fullName} />
              <Detail label={de.common.email} value={selectedPhoneBooking.email} />
              {selectedPhoneBooking.phone && (
                <Detail label={de.common.phone} value={selectedPhoneBooking.phone} />
              )}
              <Detail label={de.common.date} value={phoneBookingDisplayDate(selectedPhoneBooking)} />
              <Detail label={de.phoneBookings.timeSlot} value={selectedPhoneBooking.selectedSlot.replace("-", " – ")} />
              {selectedPhoneBooking.meetingLink && (
                <TouchableOpacity
                  style={{ flexDirection: "row", marginTop: SPACING.sm, alignItems: "center" }}
                  onPress={() => Linking.openURL(selectedPhoneBooking.meetingLink!)}
                >
                  <Text style={{ width: 110, color: COLORS.textSecondary, fontWeight: "700" }}>Google Meet:</Text>
                  <Ionicons name="videocam" size={16} color={COLORS.serviceG} style={{ marginRight: 4 }} />
                  <Text style={{ flex: 1, color: COLORS.serviceG }} numberOfLines={1}>
                    {selectedPhoneBooking.meetingLink}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={COLORS.serviceG} />
                </TouchableOpacity>
              )}
              <Detail label={de.common.status} value={selectedPhoneBooking.status} />
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

  appointmentsContainer: {
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

  // Expand Button
  expandButtonContainer: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    alignItems: "center",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  expandButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
    flexShrink: 0,
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

  // Private Service Booking
  privateBookingIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  privateBookingModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "#f5f3ff",
    marginBottom: SPACING.md,
  },

  // Phone Booking
  phoneBookingIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  phoneBookingModalBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "#f0fdfa",
    marginBottom: SPACING.md,
  },
});