// app/(app)/appointments/index.tsx - REFACTORED VERSION
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";

// Component Imports
import AppointmentCard from "@/components/appointments/AppointmentCard";
import AppointmentDetailsModal from "@/components/appointments/AppointmentDetailsModal";
import CancelConfirmModal from "@/components/appointments/CancelConfirmModal";
import StatusFilter from "@/components/appointments/StatusFilter";
import EditAppointmentModal from "@/components/appointments/EditAppointmentModal";
import ReactivateAppointmentModal from "@/components/appointments/ReactivateAppointmentModal";
import CalendarView from "@/components/appointments/CalendarView";
import BulkCancelAppointments from "@/components/appointments/BulkCancelAppointments";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/constants/theme";
import de from "@/constants/i18n";

// -------------------- Types --------------------
type MonthKey = string;
type Tab = "list" | "calendar";

type Apt = {
  midwifeId: string;
  clientId?: string;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  serviceCode?: string;
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
  data: Record<MonthKey, MonthlyBucket>;
  meta?: { monthsFound?: number; totalDocuments?: number };
};

type Timetable = {
  [weekday: string]: {
    slots: {
      [service: string]: { startTime: string; endTime: string }[];
    };
  };
};

type MidwifeProfile = {
  _id: string;
  identity?: { timetable?: Timetable };
};

type UserDetail = {
  name: string;
  email: string;
  role: string;
};

type UiApt = Apt & { serviceCode: string; dateObj: Date };

// -------------------- Helpers --------------------
const toDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((n) => parseInt(n, 10));
  return new Date(yyyy, mm - 1, dd);
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const weekdayName = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long" });
const monthKeyOf = (d: Date): MonthKey => `${d.getMonth() + 1}/${d.getFullYear()}`;
const monthTitle = (y: number, m0: number) =>
  new Date(y, m0, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

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
    if (json?.success && json.data) return json.data;
    return {};
  } catch {
    return {};
  }
}

function generateTimetableDates(
  year: number,
  timetable: Timetable | undefined,
  serviceCode: string
): Date[] {
  if (!timetable) return [];
  const dates: Date[] = [];
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  Object.keys(timetable).forEach((wdayName) => {
    const day = timetable[wdayName];
    if (!day?.slots?.[serviceCode] || day.slots[serviceCode].length === 0) return;
    const targetWeekday = weekdayMap[wdayName];
    if (targetWeekday === undefined) return;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    let current = new Date(startDate);

    while (current.getDay() !== targetWeekday) {
      current.setDate(current.getDate() + 1);
    }

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  });

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// -------------------- Main Screen --------------------
export default function AppointmentsScreen() {
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = (pf.data as unknown as MidwifeProfile | null) ?? null;
  const profileStatus = pf.status;

  const midwifeId = midwifeProfile?._id ?? "";
  const timetable: Timetable | undefined = midwifeProfile?.identity?.timetable;
  const clientET = useMemo(() => new Date(), []);

  // Core State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<Record<MonthKey, MonthlyBucket>>({});
  const [tab, setTab] = useState<Tab>("list");
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});
  const [metaInfo, setMetaInfo] = useState<{ monthsFound?: number; totalDocs?: number } | null>(
    null
  );

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [listMonthIndex, setListMonthIndex] = useState<number>(0);

  // Modal States
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<UiApt | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState<UiApt | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editSlot, setEditSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] = useState<UiApt | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivatingAppointment, setReactivatingAppointment] = useState<UiApt | null>(null);
  const [reactivateDate, setReactivateDate] = useState<Date | null>(null);
  const [reactivateSlot, setReactivateSlot] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);

  // Custom Time States
  const [showCustomTimeOption, setShowCustomTimeOption] = useState(false);
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime] = useState<string>("");
  const [availableTimeRanges, setAvailableTimeRanges] = useState<string[]>([]);

  // Fetch Appointments
  const fetchMonthly = useCallback(async () => {
    if (!midwifeId) return;

    setLoading(true);
    setError(null);

    try {
      const payload = { midwifeId, clientET: clientET.toISOString() };
      let ok =
        (await fetchMonthlyOnce(`/api/public/PostBirthAppointments/monthly-view`, payload)) ||
        (await fetchMonthlyOnce(`/app/api/public/PostBirthAppointments/monthly-view`, payload));

      if (!ok) throw new Error("No appointments returned from server");

      setMonthly(ok.data || {});
      setMetaInfo({ monthsFound: ok.meta?.monthsFound, totalDocs: ok.meta?.totalDocuments });

      const clientIds = new Set<string>();
      Object.values(ok.data || {}).forEach((bucket) => {
        const extractIds = (list: Apt[] | undefined) => {
          (list ?? []).forEach((a) => {
            if (a.clientId) clientIds.add(a.clientId);
          });
        };
        Object.values(bucket).forEach((list) => extractIds(list as Apt[]));
      });

      if (clientIds.size > 0) {
        const details = await fetchUserDetails(Array.from(clientIds));
        setUserDetails(details);
      }
    } catch (e: any) {
      setMonthly({});
      setError(e?.message ?? "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [midwifeId, clientET]);

  useEffect(() => {
    if (profileStatus === "success" && midwifeId) {
      fetchMonthly();
    } else if (profileStatus === "error") {
      setLoading(false);
    }
  }, [profileStatus, midwifeId, fetchMonthly]);

  // Flatten appointments
  const allAppointments: UiApt[] = useMemo(() => {
    const out: UiApt[] = [];
    Object.values(monthly).forEach((bucket) => {
      const add = (list: Apt[] | undefined, svc: string) => {
        (list ?? []).forEach((a) =>
          out.push({ ...a, serviceCode: svc, dateObj: toDate(a.appointmentDate) })
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
    out.sort((a, b) => {
      const d = a.dateObj.getTime() - b.dateObj.getTime();
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });
    return out;
  }, [monthly]);

  // Month list for navigation
  const monthList = useMemo(() => {
    const keys = Object.keys(monthly);
    const parsed = keys
      .map((k) => {
        const [m, y] = k.split("/").map((n) => parseInt(n, 10));
        return { key: k, y, m0: m - 1 };
      })
      .sort((a, b) => (a.y === b.y ? a.m0 - b.m0 : a.y - b.y));
    return parsed;
  }, [monthly]);

  const initialMonthIndex = useMemo(() => {
    if (monthList.length === 0) return 0;
    const today = new Date();
    const idx = monthList.findIndex(
      (x) => x.y === today.getFullYear() && x.m0 === today.getMonth()
    );
    return idx >= 0 ? idx : 0;
  }, [monthList]);

  useEffect(() => setListMonthIndex(initialMonthIndex), [initialMonthIndex]);

  const listMonthKey = monthList[listMonthIndex]?.key;

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!listMonthKey) return { all: 0, active: 0, pending: 0, cancelled: 0 };
    const monthApts = allAppointments.filter((a) => monthKeyOf(a.dateObj) === listMonthKey);
    return {
      all: monthApts.length,
      active: monthApts.filter((a) => (a.status?.toLowerCase() || "active") === "active").length,
      pending: monthApts.filter((a) => (a.status?.toLowerCase() || "active") === "pending")
        .length,
      cancelled: monthApts.filter((a) => (a.status?.toLowerCase() || "active") === "cancelled")
        .length,
    };
  }, [allAppointments, listMonthKey]);

  // Filtered appointments for list view
  const monthAppointments = useMemo(() => {
    if (!listMonthKey) return [];
    let filtered = allAppointments.filter((a) => monthKeyOf(a.dateObj) === listMonthKey);
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const aptStatus = a.status?.toLowerCase() || "active";
        return aptStatus === statusFilter;
      });
    }
    return filtered;
  }, [allAppointments, listMonthKey, statusFilter]);

  // Calendar data
  const minDate = useMemo(
    () => (allAppointments[0]?.dateObj ? new Date(allAppointments[0].dateObj) : null),
    [allAppointments]
  );

  const maxDate = useMemo(
    () =>
      allAppointments[allAppointments.length - 1]?.dateObj
        ? new Date(allAppointments[allAppointments.length - 1].dateObj)
        : null,
    [allAppointments]
  );

  const calendarMonths = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const arr: { y: number; m: number; key: string; title: string }[] = [];
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    for (
      let y = start.getFullYear(), m = start.getMonth();
      y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth());

    ) {
      const key = `${m + 1}/${y}`;
      const title = monthTitle(y, m);
      arr.push({ y, m, key, title });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return arr;
  }, [minDate, maxDate]);

  const apptsByDay = useMemo(() => {
    const m: Record<string, UiApt[]> = {};
    allAppointments.forEach((a) => {
      const key = toDMY(a.dateObj);
      if (!m[key]) m[key] = [];
      m[key].push(a);
    });
    return m;
  }, [allAppointments]);

  // Helper: Get patient name
  const getPatientName = (clientId?: string) => {
    if (!clientId) return "—";
    return userDetails[clientId]?.name ?? "Loading...";
  };

  // Helper: Weekday slots
  const weekdaySlots = useCallback(
    (d: Date, serviceCode: string) => {
      if (!timetable) return [];
      const wname = weekdayName(d);
      const day = timetable[wname];
      if (!day) return [];
      const slotsForService = day.slots?.[serviceCode] ?? [];
      return slotsForService.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
    },
    [timetable]
  );

  // Helper: Occupied slots
  const occupiedSlotSet = useCallback(
    (d: Date) => {
      const key = toDMY(d);
      const list = apptsByDay[key] ?? [];
      const set = new Set<string>();
      list.forEach((a) => set.add(`${a.startTime}-${a.endTime}`));
      return set;
    },
    [apptsByDay]
  );

  // Valid dates for editing
  const validDatesSet = useMemo(() => {
    if (!selectedEdit) return new Set<string>();
    const currentYear = new Date().getFullYear();
    const candidateDays = generateTimetableDates(currentYear, timetable, selectedEdit.serviceCode);
    const set = new Set<string>();
    candidateDays.forEach((d) => set.add(toDMY(d)));
    return set;
  }, [selectedEdit, timetable]);

  // Available slots for edit
  const availableSlotsForEditDate = useMemo(() => {
    if (!selectedEdit || !editDate) return [];
    const raw = weekdaySlots(editDate, selectedEdit.serviceCode);
    const occ = occupiedSlotSet(editDate);
    const originalKey = `${selectedEdit.startTime}-${selectedEdit.endTime}`;
    return raw.filter((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      return key === originalKey || !occ.has(key);
    });
  }, [selectedEdit, editDate, weekdaySlots, occupiedSlotSet]);

  // Valid dates for reactivate
  const reactivateValidDatesSet = useMemo(() => {
    if (!reactivatingAppointment) return new Set<string>();
    const currentYear = new Date().getFullYear();
    const candidateDays = generateTimetableDates(
      currentYear,
      timetable,
      reactivatingAppointment.serviceCode
    );
    const set = new Set<string>();
    candidateDays.forEach((d) => set.add(toDMY(d)));
    return set;
  }, [reactivatingAppointment, timetable]);

  // Available slots for reactivate
  const availableSlotsForReactivateDate = useMemo(() => {
    if (!reactivatingAppointment || !reactivateDate) return [];
    const raw = weekdaySlots(reactivateDate, reactivatingAppointment.serviceCode);
    const occ = occupiedSlotSet(reactivateDate);
    return raw.filter((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      return !occ.has(key);
    });
  }, [reactivatingAppointment, reactivateDate, weekdaySlots, occupiedSlotSet]);

  // Handlers
  const openDetails = useCallback((apt: UiApt) => {
    setSelectedDetails(apt);
    setShowDetailsModal(true);
  }, []);

  const closeDetails = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedDetails(null);
  }, []);

  const openEdit = useCallback((apt: UiApt) => {
    setSelectedEdit(apt);
    const aptDate = toDate(apt.appointmentDate);
    setEditDate(aptDate);
    setEditSlot({ startTime: apt.startTime, endTime: apt.endTime });
    setShowCustomTimeOption(false);
    setCustomStartTime("");
    setCustomEndTime("");
    setAvailableTimeRanges([]);
    setShowEditModal(true);
  }, []);

  const closeEdit = useCallback(() => {
    setShowEditModal(false);
    setSelectedEdit(null);
    setEditDate(null);
    setEditSlot(null);
    setShowCustomTimeOption(false);
    setCustomStartTime("");
    setCustomEndTime("");
    setAvailableTimeRanges([]);
  }, []);

  const submitEdit = useCallback(async () => {
    if (!selectedEdit || !editDate) return;

    if (showCustomTimeOption && (!customStartTime || !customEndTime)) {
      Alert.alert("Error", "Please select start time for custom slot");
      return;
    }

    if (!showCustomTimeOption && !editSlot) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    setSubmitting(true);
    try {
      const serviceCode = selectedEdit.serviceCode;
      const updatedDate = toDMY(editDate);
      const updatedStartTime = showCustomTimeOption ? customStartTime : editSlot!.startTime;
      const updatedEndTime = showCustomTimeOption ? customEndTime : editSlot!.endTime;

      const basePayload: any = {
        serviceCode,
        appointmentId: selectedEdit.appointmentId,
        updatedDate,
        updatedStartTime,
        updatedEndTime,
      };

      const payload =
        serviceCode === "A1/A2"
          ? basePayload
          : { ...basePayload, midwifeId, clientId: selectedEdit.clientId };

      const res = await api(`/api/public/changeAppointmentSlots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await readJsonSafe<any>(res);
      if (!res.ok || json?.success !== true)
        throw new Error(json?.error || "Failed to update appointment");

      await fetchMonthly();
      setSubmitting(false);
      closeEdit();
      Alert.alert("Success", "Appointment updated successfully");
    } catch (e: any) {
      setSubmitting(false);
      Alert.alert("Error", e?.message ?? "Failed to update appointment");
    }
  }, [
    selectedEdit,
    editDate,
    editSlot,
    showCustomTimeOption,
    customStartTime,
    customEndTime,
    midwifeId,
    fetchMonthly,
    closeEdit,
  ]);

  // Cancel handlers
  const openCancelConfirm = (apt: UiApt) => {
    setCancelingAppointment(apt);
    setShowCancelConfirm(true);
  };

  const closeCancelConfirm = () => {
    if (!isCanceling) {
      setShowCancelConfirm(false);
      setCancelingAppointment(null);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelingAppointment) return;

    setIsCanceling(true);

    try {
      const body: any = {
        appointmentId: cancelingAppointment.appointmentId,
        serviceCode: cancelingAppointment.serviceCode,
      };

      if (cancelingAppointment.serviceCode !== "A1/A2") {
        body.midwifeId = cancelingAppointment.midwifeId;
        body.clientId = cancelingAppointment.clientId;
      }

      const response = await api("/api/public/cancelAppointment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert("Success", result.message || "Appointment cancelled successfully");
        setShowCancelConfirm(false);
        setCancelingAppointment(null);
        closeEdit();
        closeDetails();
        await fetchMonthly();
      } else {
        Alert.alert("Error", result.error || result.details || "Failed to cancel appointment");
      }
    } catch (error: any) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  // Reactivate handlers
  const openReactivateModal = (apt: UiApt) => {
    setReactivatingAppointment(apt);
    const aptDate = toDate(apt.appointmentDate);
    setReactivateDate(aptDate);
    setReactivateSlot({ startTime: apt.startTime, endTime: apt.endTime });
    setShowReactivateModal(true);
  };

  const closeReactivateModal = () => {
    if (!isReactivating) {
      setShowReactivateModal(false);
      setReactivatingAppointment(null);
      setReactivateDate(null);
      setReactivateSlot(null);
    }
  };

  const handleReactivateAppointment = async () => {
    if (!reactivatingAppointment || !reactivateDate || !reactivateSlot) {
      Alert.alert("Error", "Please select a date and time slot");
      return;
    }

    setIsReactivating(true);

    try {
      const body: any = {
        appointmentId: reactivatingAppointment.appointmentId,
        serviceCode: reactivatingAppointment.serviceCode,
        updatedDate: toDMY(reactivateDate),
        updatedStartTime: reactivateSlot.startTime,
        updatedEndTime: reactivateSlot.endTime,
      };

      if (reactivatingAppointment.serviceCode !== "A1/A2") {
        body.midwifeId = reactivatingAppointment.midwifeId;
        body.clientId = reactivatingAppointment.clientId;
      }

      const response = await api("/api/public/reactivateAppointment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert("Success", result.message || "Appointment reactivated successfully");
        setShowReactivateModal(false);
        setReactivatingAppointment(null);
        setReactivateDate(null);
        setReactivateSlot(null);
        closeDetails();
        await fetchMonthly();
      } else {
        Alert.alert("Error", result.error || result.details || "Failed to reactivate appointment");
      }
    } catch (error: any) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsReactivating(false);
    }
  };

  // Custom time helpers
  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, "0");
        const m = minute.toString().padStart(2, "0");
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getServiceDuration = (serviceCode: string): number => {
    const durations: Record<string, number> = {
      "A1/A2": 50,
      B1: 60,
      B2: 50,
      E1: 140,
      C1: 60,
      C2: 25,
      D1: 60,
      D2: 25,
      F1: 75,
    };
    return durations[serviceCode] || 60;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const findAvailableTimeRanges = useCallback(
    (date: Date): string[] => {
      if (!timetable) return ["00:00 - 23:59 available"];
      const dayName = weekdayName(date);
      const daySlots = timetable[dayName];
      if (!daySlots?.slots) return ["00:00 - 23:59 available"];

      const busySlots: { start: number; end: number }[] = [];
      Object.values(daySlots.slots).forEach((serviceSlots: any) => {
        if (Array.isArray(serviceSlots)) {
          serviceSlots.forEach((slot: { startTime: string; endTime: string }) => {
            busySlots.push({ start: parseTime(slot.startTime), end: parseTime(slot.endTime) });
          });
        }
      });

      const dateStr = toDMY(date);
      const dayApts = apptsByDay[dateStr] ?? [];
      dayApts.forEach((apt) => {
        const duration = getServiceDuration(apt.serviceCode);
        const endTime = calculateEndTime(apt.startTime, duration);
        busySlots.push({ start: parseTime(apt.startTime), end: parseTime(endTime) });
      });

      busySlots.sort((a, b) => a.start - b.start);
      const mergedBusy: { start: number; end: number }[] = [];
      busySlots.forEach((slot) => {
        if (mergedBusy.length === 0) {
          mergedBusy.push(slot);
        } else {
          const last = mergedBusy[mergedBusy.length - 1];
          if (slot.start <= last.end) {
            last.end = Math.max(last.end, slot.end);
          } else {
            mergedBusy.push(slot);
          }
        }
      });

      const freeRanges: string[] = [];
      let currentTime = 0;
      mergedBusy.forEach((busy) => {
        if (currentTime < busy.start) {
          const startHour = Math.floor(currentTime / 60);
          const startMin = currentTime % 60;
          const endHour = Math.floor(busy.start / 60);
          const endMin = busy.start % 60;
          freeRanges.push(
            `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")} - ${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")} available`
          );
        }
        currentTime = busy.end;
      });

      if (currentTime < 24 * 60) {
        const startHour = Math.floor(currentTime / 60);
        const startMin = currentTime % 60;
        freeRanges.push(
          `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")} - 23:59 available`
        );
      }

      return freeRanges.length > 0 ? freeRanges : ["No free time available"];
    },
    [timetable, apptsByDay]
  );

  const filterTimeOptionsByAvailableRanges = useCallback(
    (ranges: string[]): string[] => {
      if (ranges[0] === "No free time available") return [];
      const allTimes = generateTimeOptions();
      const availableTimes: string[] = [];

      ranges.forEach((range) => {
        const match = range.match(/(\d{2}):(\d{2}) - (\d{2}):(\d{2})/);
        if (match) {
          const rangeStart = `${match[1]}:${match[2]}`;
          const rangeEnd = `${match[3]}:${match[4]}`;
          const startMinutes = parseTime(rangeStart);
          const endMinutes = parseTime(rangeEnd);

          allTimes.forEach((time) => {
            const timeMinutes = parseTime(time);
            if (selectedEdit) {
              const duration = getServiceDuration(selectedEdit.serviceCode);
              const endTimeMinutes = timeMinutes + duration;
              if (timeMinutes >= startMinutes && endTimeMinutes <= endMinutes) {
                availableTimes.push(time);
              }
            }
          });
        }
      });

      return availableTimes;
    },
    [selectedEdit]
  );

  const handleCustomStartTimeChange = (time: string) => {
    setCustomStartTime(time);
    if (selectedEdit) {
      const duration = getServiceDuration(selectedEdit.serviceCode);
      const end = calculateEndTime(time, duration);
      setCustomEndTime(end);
    }
  };

  const toggleCustomTime = () => {
    const newState = !showCustomTimeOption;
    setShowCustomTimeOption(newState);
    if (newState) {
      setEditSlot(null);
      if (editDate) {
        const ranges = findAvailableTimeRanges(editDate);
        setAvailableTimeRanges(ranges);
      }
    } else {
      setCustomStartTime("");
      setCustomEndTime("");
    }
  };

  // Render
  if (pf.status === "loading" || !midwifeId) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.background }]}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.sm, color: COLORS.textSecondary }}>{de.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{de.appointments.title}</Text>

        <View style={styles.tabsWrap}>
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setTab("list")}
              style={[styles.tabBtn, tab === "list" && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === "list" && styles.tabTextActive]}>
                {de.appointments.listView}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab("calendar")}
              style={[styles.tabBtn, tab === "calendar" && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === "calendar" && styles.tabTextActive]}>
                {de.appointments.calendarView}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={fetchMonthly} style={styles.reloadBtn}>
              <Text style={styles.reloadText}>{de.actions.refresh}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowBulkCancelModal(true)}
              style={styles.bulkCancelBtn}
            >
              <Text style={styles.bulkCancelText}>{de.appointments.bulkCancel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.metaText}>
          {metaInfo?.monthsFound != null ? `${de.common.months}: ${metaInfo.monthsFound}` : ""}{" "}
          {metaInfo?.totalDocs != null ? `• ${de.common.total}: ${metaInfo.totalDocs}` : ""}
        </Text>
      </View>

      {error && (
        <View style={{ paddingHorizontal: SPACING.lg }}>
          <Text style={{ color: COLORS.error }}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={[styles.center, { padding: 20 }]}>
          <ActivityIndicator />
        </View>
      ) : tab === "list" ? (
        <>
          {/* Status Filter */}
          <StatusFilter
            selectedFilter={statusFilter}
            statusCounts={statusCounts}
            onFilterChange={setStatusFilter}
          />

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setListMonthIndex((i) => Math.max(0, i - 1))}
              disabled={listMonthIndex <= 0}
              style={[styles.navBtn, listMonthIndex <= 0 && styles.navBtnDisabled]}
            >
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthNavTitle}>
              {monthList[listMonthIndex]
                ? monthTitle(monthList[listMonthIndex].y, monthList[listMonthIndex].m0)
                : "—"}
            </Text>
            <TouchableOpacity
              onPress={() => setListMonthIndex((i) => Math.min(monthList.length - 1, i + 1))}
              disabled={listMonthIndex >= monthList.length - 1}
              style={[
                styles.navBtn,
                listMonthIndex >= monthList.length - 1 && styles.navBtnDisabled,
              ]}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Appointments List */}
          <FlatList
            data={monthAppointments}
            keyExtractor={(item) => `${item.serviceCode}-${item.appointmentId}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={[styles.center, { padding: 24 }]}>
                <Text style={styles.emptyText}>No appointments this month.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <AppointmentCard
                appointment={item}
                patientName={getPatientName(item.clientId)}
                onPressDetails={() => openDetails(item)}
                onPressEdit={() => openEdit(item)}
              />
            )}
          />
        </>
      ) : (
        <CalendarView
          months={calendarMonths}
          apptsByDay={apptsByDay}
          onPressAppt={openDetails}
          onPressEdit={openEdit}
          getPatientName={getPatientName}
        />
      )}

      {/* Modals */}
      <AppointmentDetailsModal
        visible={showDetailsModal}
        appointment={selectedDetails}
        onClose={closeDetails}
        onEdit={openEdit}
        onCancel={openCancelConfirm}
        onReactivate={openReactivateModal}
        getPatientName={getPatientName}
      />

      <CancelConfirmModal
        visible={showCancelConfirm}
        appointment={cancelingAppointment}
        isCanceling={isCanceling}
        onConfirm={handleCancelAppointment}
        onCancel={closeCancelConfirm}
        getPatientName={getPatientName}
      />

      <EditAppointmentModal
        visible={showEditModal}
        appointment={selectedEdit}
        timetable={timetable}
        validDatesSet={validDatesSet}
        availableSlots={availableSlotsForEditDate}
        submitting={submitting}
        onClose={closeEdit}
        onDateChange={setEditDate}
        onSlotSelect={setEditSlot}
        onSubmit={submitEdit}
        onCancelAppointment={() => {
          if (selectedEdit) {
            closeEdit();
            openCancelConfirm(selectedEdit);
          }
        }}
        selectedDate={editDate}
        selectedSlot={editSlot}
        showCustomTime={showCustomTimeOption}
        customStartTime={customStartTime}
        customEndTime={customEndTime}
        availableTimeRanges={availableTimeRanges}
        onToggleCustomTime={toggleCustomTime}
        onCustomStartTimeChange={handleCustomStartTimeChange}
        filterTimeOptions={filterTimeOptionsByAvailableRanges}
        getServiceDuration={getServiceDuration}
      />

      <ReactivateAppointmentModal
        visible={showReactivateModal}
        appointment={reactivatingAppointment}
        timetable={timetable}
        validDatesSet={reactivateValidDatesSet}
        availableSlots={availableSlotsForReactivateDate}
        isReactivating={isReactivating}
        onClose={closeReactivateModal}
        onDateChange={setReactivateDate}
        onSlotSelect={setReactivateSlot}
        onReactivate={handleReactivateAppointment}
        selectedDate={reactivateDate}
        selectedSlot={reactivateSlot}
      />

      <BulkCancelAppointments
        visible={showBulkCancelModal}
        onClose={() => setShowBulkCancelModal(false)}
        midwifeId={midwifeId}
        allAppointments={allAppointments}
        onSuccess={fetchMonthly}
        getPatientName={getPatientName}
      />
    </View>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: SPACING.sm },
  tabsWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  tabs: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: "row",
    padding: 4,
    gap: SPACING.xs,
    alignSelf: "flex-start",
  },
  tabBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm },
  tabActive: { backgroundColor: COLORS.card },
  tabText: { color: COLORS.textSecondary, fontWeight: "700" },
  tabTextActive: { color: COLORS.text },
  buttonRow: { flexDirection: "row", gap: SPACING.sm },
  reloadBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
  },
  reloadText: { color: COLORS.primary, fontWeight: "800" },
  bulkCancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: "transparent",
  },
  bulkCancelText: { color: COLORS.error, fontWeight: "800" },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  monthNav: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.backgroundGray },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: COLORS.text, fontWeight: "700" },
  monthNavTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  listContent: { padding: SPACING.lg, gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary, textAlign: "center" },
});