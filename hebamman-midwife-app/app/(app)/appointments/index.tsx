import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";

// -------------------- Theme --------------------
const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  amber: "#EAB308",
  green: "#22C55E",
  line: "#E5E7EB",
};

const SCREEN_WIDTH = Dimensions.get('window').width;


// -------------------- Types --------------------
type MonthKey = string; // "M/YYYY"

type Apt = {
  midwifeId: string;
  clientId?: string;
  appointmentId: string;
  appointmentDate: string; // "DD/MM/YYYY"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  duration: number; // minutes
  status?: string;
  serviceCode?: string; // set by us for A1/A2
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

// -------------------- Helpers --------------------
const toDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((n) => parseInt(n, 10));
  return new Date(yyyy, mm - 1, dd);
};
const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toDMY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const weekdayName = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long" });
const monthKeyOf = (d: Date): MonthKey => `${d.getMonth() + 1}/${d.getFullYear()}`;
const monthTitle = (y: number, m0: number) =>
  new Date(y, m0, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

// service colors
const SERVICE_COLORS: Record<string, string> = {
  "A1/A2": "#7c3aed",
  B1: "#2563eb",
  B2: "#0ea5e9",
  E1: "#f59e0b",
  C1: "#16a34a",
  C2: "#10b981",
  D1: "#ef4444",
  D2: "#f97316",
  F1: "#a855f7",
};
const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.sage;

// safe JSON
async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// success-or-null fetcher
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

// Fetch user details by IDs
async function fetchUserDetails(ids: string[]): Promise<Record<string, UserDetail>> {
  try {
    console.log("Calling user details API with ids:", ids);
    const res = await api("/api/public/user/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    console.log("User details API response status:", res.status);
    const json = await readJsonSafe<{ success: boolean; data: Record<string, UserDetail> }>(res);
    console.log("User details API response:", json);
    if (json?.success && json.data) {
      return json.data;
    }
    return {};
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {};
  }
}

// Generate all dates in a year that match timetable for a service
function generateTimetableDates(year: number, timetable: Timetable | undefined, serviceCode: string): Date[] {
  if (!timetable) return [];
  
  const dates: Date[] = [];
  const weekdays = Object.keys(timetable);
  
  // Map weekday names to numbers (0 = Sunday, 1 = Monday, etc.)
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  
  // For each weekday that has slots for this service
  weekdays.forEach((wdayName) => {
    const day = timetable[wdayName];
    if (!day?.slots?.[serviceCode] || day.slots[serviceCode].length === 0) return;
    
    const targetWeekday = weekdayMap[wdayName];
    if (targetWeekday === undefined) return;
    
    // Generate all dates in the year that fall on this weekday
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Find first occurrence of this weekday
    let current = new Date(startDate);
    while (current.getDay() !== targetWeekday) {
      current.setDate(current.getDate() + 1);
    }
    
    // Add all occurrences
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  });
  
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

// -------------------- UI types --------------------
type Tab = "list" | "calendar";
type UiApt = Apt & { serviceCode: string; dateObj: Date };

// -------------------- Main Screen --------------------
export default function AppointmentsScreen() {
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = (pf.data as unknown as MidwifeProfile | null) ?? null;
  const profileStatus = pf.status;

  const midwifeId = midwifeProfile?._id ?? "";
  const timetable: Timetable | undefined = midwifeProfile?.identity?.timetable;

  // using "now" as ET anchor; swap with real ET if needed
  const clientET = useMemo(() => new Date(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<Record<MonthKey, MonthlyBucket>>({});
  const [tab, setTab] = useState<Tab>("list");
  const [userDetails, setUserDetails] = useState<Record<string, UserDetail>>({});

  // month navigation for LIST
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
    const idx = monthList.findIndex((x) => x.y === today.getFullYear() && x.m0 === today.getMonth());
    return idx >= 0 ? idx : 0;
  }, [monthList]);

  const [listMonthIndex, setListMonthIndex] = useState<number>(0);
  useEffect(() => setListMonthIndex(initialMonthIndex), [initialMonthIndex]);

  // selection: Details vs Edit (separate!)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<UiApt | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState<UiApt | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editSlot, setEditSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Custom time slot states
  const [showCustomTimeOption, setShowCustomTimeOption] = useState(false);
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime] = useState<string>("");
  const [availableTimeRanges, setAvailableTimeRanges] = useState<string[]>([]);

  // Delete/Cancel states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState<UiApt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [metaInfo, setMetaInfo] = useState<{ monthsFound?: number; totalDocs?: number } | null>(null);

  const fetchMonthly = useCallback(async () => {
    if (!midwifeId) {
      console.log("No midwifeId, skipping fetch");
      return;
    }
    
    console.log("Starting fetchMonthly with midwifeId:", midwifeId);
    setLoading(true);
    setError(null);
    
    try {
      const payload = { midwifeId, clientET: clientET.toISOString() };
      console.log("Fetching with payload:", payload);
      
      let ok =
        (await fetchMonthlyOnce(`/api/public/PostBirthAppointments/monthly-view`, payload)) ||
        (await fetchMonthlyOnce(`/app/api/public/PostBirthAppointments/monthly-view`, payload));
      
      console.log("Fetch result:", ok);
      
      if (!ok) {
        console.log("No data returned from API");
        throw new Error("No appointments returned from server");
      }

      setMonthly(ok.data || {});
      setMetaInfo({ monthsFound: ok.meta?.monthsFound, totalDocs: ok.meta?.totalDocuments });
      console.log("Set monthly data, months:", ok.meta?.monthsFound);

      // Extract all unique clientIds
      const clientIds = new Set<string>();
      Object.values(ok.data || {}).forEach((bucket) => {
        const extractIds = (list: Apt[] | undefined) => {
          (list ?? []).forEach((a) => {
            if (a.clientId) clientIds.add(a.clientId);
          });
        };
        extractIds(bucket["A1/A2"]);
        extractIds(bucket.B1);
        extractIds(bucket.B2);
        extractIds(bucket.E1);
        extractIds(bucket.C1);
        extractIds(bucket.C2);
        extractIds(bucket.D1);
        extractIds(bucket.D2);
        extractIds(bucket.F1);
      });

      console.log("Fetching user details for clientIds:", Array.from(clientIds));
      
      // Fetch user details for all clientIds
      if (clientIds.size > 0) {
        const details = await fetchUserDetails(Array.from(clientIds));
        console.log("User details fetched:", details);
        setUserDetails(details);
      }
      
      console.log("fetchMonthly completed successfully");
    } catch (e: any) {
      console.error("Error in fetchMonthly:", e);
      setMonthly({});
      setError(e?.message ?? "Failed to load appointments");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  }, [midwifeId]);

  useEffect(() => {
    console.log("useEffect triggered - profileStatus:", profileStatus, "midwifeId:", midwifeId);
    if (profileStatus === "success" && midwifeId) {
      console.log("Calling fetchMonthly");
      fetchMonthly();
    } else if (profileStatus === "error") {
      console.log("Profile status is error");
      setLoading(false);
    }
  }, [profileStatus, midwifeId]);

  // flatten to ALL, then filter by current list month
  const allAppointments: UiApt[] = useMemo(() => {
    const out: UiApt[] = [];
    Object.values(monthly).forEach((bucket) => {
      const add = (list: Apt[] | undefined, svc: string) => {
        (list ?? []).forEach((a) => out.push({ ...a, serviceCode: svc, dateObj: toDate(a.appointmentDate) }));
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

  const listMonthKey = monthList[listMonthIndex]?.key;
  const monthAppointments = useMemo(() => {
    if (!listMonthKey) return [];
    return allAppointments.filter((a) => monthKeyOf(a.dateObj) === listMonthKey);
  }, [allAppointments, listMonthKey]);

  // ---------------- CALENDAR (all months) ----------------
  const minDate = useMemo(
    () => (allAppointments[0]?.dateObj ? new Date(allAppointments[0].dateObj) : null),
    [allAppointments]
  );
  const maxDate = useMemo(
    () => (allAppointments[allAppointments.length - 1]?.dateObj ? new Date(allAppointments[allAppointments.length - 1].dateObj) : null),
    [allAppointments]
  );

  const calendarMonths: { y: number; m: number; key: string; title: string }[] = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const arr: { y: number; m: number; key: string; title: string }[] = [];
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); ) {
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

  // ---------- EDIT helpers ----------
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

  // Generate candidate dates for the entire current year based on timetable
  const candidateDays = useMemo(() => {
    if (!selectedEdit) return [];
    const currentYear = new Date().getFullYear();
    return generateTimetableDates(currentYear, timetable, selectedEdit.serviceCode);
  }, [selectedEdit, timetable]);

  // Create a set of valid dates for quick lookup
  const validDatesSet = useMemo(() => {
    const set = new Set<string>();
    candidateDays.forEach(d => set.add(toDMY(d)));
    return set;
  }, [candidateDays]);

  // Calendar state for edit modal
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

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

  const openDetails = useCallback((apt: UiApt) => {
    setSelectedDetails(apt);
    setDetailsOpen(true);
  }, []);
  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedDetails(null);
  }, []);

  const openEdit = useCallback((apt: UiApt) => {
    setSelectedEdit(apt);
    const aptDate = toDate(apt.appointmentDate);
    setEditDate(aptDate);
    setCalendarMonth(new Date(aptDate.getFullYear(), aptDate.getMonth(), 1));
    setEditSlot({ startTime: apt.startTime, endTime: apt.endTime });
    setShowCustomTimeOption(false);
    setCustomStartTime("");
    setCustomEndTime("");
    setAvailableTimeRanges([]);
    setEditOpen(true);
  }, []);
  const closeEdit = useCallback(() => {
    setEditOpen(false);
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

    // Validate time slot selection
    if (showCustomTimeOption) {
      if (!customStartTime || !customEndTime) {
        alert("Please select start time for custom slot");
        return;
      }
      if (!isCustomTimeValid(customStartTime, customEndTime, editDate)) {
        return;
      }
    } else {
      if (!editSlot) {
        alert("Please select a time slot");
        return;
      }
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
      if (!res.ok || json?.success !== true) throw new Error(json?.error || "Failed to update appointment");

      await fetchMonthly();
      setSubmitting(false);
      closeEdit();
    } catch (e: any) {
      setSubmitting(false);
      setError(e?.message ?? "Failed to update appointment");
    }
  }, [selectedEdit, editDate, editSlot, showCustomTimeOption, customStartTime, customEndTime, midwifeId, fetchMonthly, closeEdit]);

  // Get patient name
  const getPatientName = (clientId?: string) => {
    if (!clientId) return "—";
    return userDetails[clientId]?.name ?? "Loading...";
  };

  // Helper functions for custom time slots
  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
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
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const findAvailableTimeRanges = useCallback((date: Date): string[] => {
    if (!timetable) return ["00:00 - 23:59 available"];

    const dayName = weekdayName(date);
    const daySlots = timetable[dayName];

    if (!daySlots?.slots) return ["00:00 - 23:59 available"];

    const busySlots: { start: number; end: number }[] = [];

    Object.values(daySlots.slots).forEach((serviceSlots: any) => {
      if (Array.isArray(serviceSlots)) {
        serviceSlots.forEach((slot: { startTime: string; endTime: string }) => {
          busySlots.push({
            start: parseTime(slot.startTime),
            end: parseTime(slot.endTime)
          });
        });
      }
    });

    const dateStr = toDMY(date);
    const dayApts = apptsByDay[dateStr] ?? [];

    dayApts.forEach(apt => {
      const duration = getServiceDuration(apt.serviceCode);
      const endTime = calculateEndTime(apt.startTime, duration);
      busySlots.push({
        start: parseTime(apt.startTime),
        end: parseTime(endTime)
      });
    });

    busySlots.sort((a, b) => a.start - b.start);
    const mergedBusy: { start: number; end: number }[] = [];

    busySlots.forEach(slot => {
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

    mergedBusy.forEach(busy => {
      if (currentTime < busy.start) {
        const startHour = Math.floor(currentTime / 60);
        const startMin = currentTime % 60;
        const endHour = Math.floor(busy.start / 60);
        const endMin = busy.start % 60;

        freeRanges.push(
          `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')} available`
        );
      }
      currentTime = busy.end;
    });

    if (currentTime < 24 * 60) {
      const startHour = Math.floor(currentTime / 60);
      const startMin = currentTime % 60;
      freeRanges.push(
        `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - 23:59 available`
      );
    }

    return freeRanges.length > 0 ? freeRanges : ["No free time available"];
  }, [timetable, apptsByDay]);

  const isCustomTimeValid = (startTime: string, endTime: string, date: Date): boolean => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (endMinutes <= startMinutes) {
      alert("End time must be after start time");
      return false;
    }

    const ranges = findAvailableTimeRanges(date);

    if (ranges[0] === "No free time available") {
      alert("No free time available on this date");
      return false;
    }

    for (const range of ranges) {
      const match = range.match(/(\d{2}):(\d{2}) - (\d{2}):(\d{2})/);
      if (match) {
        const rangeStart = parseInt(match[1]) * 60 + parseInt(match[2]);
        const rangeEnd = parseInt(match[3]) * 60 + parseInt(match[4]);

        if (startMinutes >= rangeStart && endMinutes <= rangeEnd) {
          return true;
        }
      }
    }

    alert("Selected time is not within available time ranges");
    return false;
  };

  // Delete/Cancel handlers
  const handleCancelClick = (apt: UiApt) => {
    setDeletingAppointment(apt);
    setShowDeleteConfirm(true);
  };

  const handleConfirmCancel = async () => {
    if (!deletingAppointment) return;
    
    setIsDeleting(true);
    try {
      // TODO: Add API call here when ready
      // const response = await api(`/api/appointments/${deletingAppointment.appointmentId}`, {
      //   method: 'DELETE'
      // });
      
      console.log("Cancelling appointment:", deletingAppointment.appointmentId);
      
      // For now, just close the modals
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // TODO: After API is implemented, refresh data
      // await fetchMonthly();
      
      setShowDeleteConfirm(false);
      setDeletingAppointment(null);
      closeDetails();
      closeEdit();
      
      // Show success message
      alert("Appointment cancelled successfully!");
      
    } catch (e: any) {
      console.error("Error cancelling appointment:", e);
      setError(e?.message ?? "Failed to cancel appointment");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingAppointment(null);
  };

  // -------------------- Render --------------------
  if (pf.status === "loading" || !midwifeId) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.bg }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: COLORS.dim }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>

        {/* Tabs + reload */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => setTab("list")} style={[styles.tabBtn, tab === "list" && styles.tabActive]}>
              <Text style={[styles.tabText, tab === "list" && styles.tabTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab("calendar")} style={[styles.tabBtn, tab === "calendar" && styles.tabActive]}>
              <Text style={[styles.tabText, tab === "calendar" && styles.tabTextActive]}>Calendar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={fetchMonthly} style={styles.reloadBtn}>
            <Text style={styles.reloadText}>Reload</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.metaText}>
          {metaInfo?.monthsFound != null ? `Months: ${metaInfo.monthsFound}` : ""}{" "}
          {metaInfo?.totalDocs != null ? `• Total: ${metaInfo.totalDocs}` : ""}
        </Text>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: "crimson" }}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={[styles.center, { padding: 20 }]}>
          <ActivityIndicator />
        </View>
      ) : tab === "list" ? (
        <>
          {/* Month nav for LIST */}
          <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity
              onPress={() => setListMonthIndex((i) => Math.max(0, i - 1))}
              disabled={listMonthIndex <= 0}
              style={[styles.navBtn, listMonthIndex <= 0 && { opacity: 0.4 }]}
            >
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { textAlign: "center" }]}>
              {monthList[listMonthIndex] ? monthTitle(monthList[listMonthIndex].y, monthList[listMonthIndex].m0) : "—"}
            </Text>
            <TouchableOpacity
              onPress={() => setListMonthIndex((i) => Math.min(monthList.length - 1, i + 1))}
              disabled={listMonthIndex >= monthList.length - 1}
              style={[styles.navBtn, listMonthIndex >= monthList.length - 1 && { opacity: 0.4 }]}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* LIST: only current month */}
          <FlatList
            data={monthAppointments}
            keyExtractor={(item) => `${item.serviceCode}-${item.appointmentId}`}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={
              <View style={[styles.center, { padding: 24 }]}>
                <Text style={{ color: COLORS.dim, textAlign: "center" }}>No appointments this month.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: codeColor(item.serviceCode) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {item.serviceCode} • {getPatientName(item.clientId)}
                  </Text>
                  <Text style={styles.rowSub}>
                    {fmtDateShort(item.dateObj)} • {item.startTime}–{item.endTime} • {item.duration}m
                  </Text>
                  <Text style={styles.statusText}>
                    Status: <Text style={{ fontWeight: "800" }}>{item.status ?? "—"}</Text>
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity onPress={() => openDetails(item)} style={styles.ghostBtn}>
                    <Text style={styles.ghostText}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      ) : (
        // ---------------- CALENDAR (all months) ----------------
        <CalendarAllMonths
          months={calendarMonths}
          apptsByDay={apptsByDay}
          onPressAppt={openDetails}
          onPressEdit={openEdit}
          getPatientName={getPatientName}
        />
      )}

      {/* Details modal */}
      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Text style={{ fontWeight: "800", color: COLORS.dim }}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedDetails ? (
              <>
                <Row label="Patient" value={getPatientName(selectedDetails.clientId)} />
                <Row label="Service" value={selectedDetails.serviceCode} />
                <Row label="Date" value={selectedDetails.appointmentDate} />
                <Row label="Time" value={`${selectedDetails.startTime}–${selectedDetails.endTime}`} />
                <Row label="Duration" value={`${selectedDetails.duration} min`} />
                <Row label="Status" value={selectedDetails.status ?? "—"} />
                <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const s = selectedDetails;
                      closeDetails();
                      if (s) openEdit(s);
                    }}
                    style={styles.cta}
                  >
                    <Text style={styles.ctaText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeDetails} style={styles.secondary}>
                    <Text style={styles.secondaryText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reschedule {selectedEdit?.serviceCode}</Text>
              <TouchableOpacity onPress={closeEdit}>
                <Text style={{ fontWeight: "800", color: COLORS.dim, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {!timetable ? (
              <Text style={{ color: "crimson" }}>No timetable found for this midwife.</Text>
            ) : selectedEdit ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
                {/* Month navigation */}
                <View style={styles.editCalendarHeader}>
                  <TouchableOpacity
                    onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    style={styles.monthNavBtn}
                  >
                    <Text style={styles.navBtnText}>◀</Text>
                  </TouchableOpacity>
                  <Text style={styles.monthTitle}>
                    {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    style={styles.monthNavBtn}
                  >
                    <Text style={styles.navBtnText}>▶</Text>
                  </TouchableOpacity>
                </View>

                {/* Week header */}
                <View style={styles.weekHeader}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <Text key={d} style={styles.weekHdrText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.grid}>
                  {(() => {
                    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                    const startWeekday = firstDay.getDay();
                    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
                    const cells = [];

                    // Empty cells before month starts
                    for (let i = 0; i < startWeekday; i++) {
                      cells.push(<View key={`empty-${i}`} style={styles.gridCell} />);
                    }

                    // Days of month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                      const dateKey = toDMY(date);
                      const isValid = validDatesSet.has(dateKey);
                      const isSelected = editDate && sameDay(date, editDate);

                      cells.push(
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.gridCell,
                            !isValid && { opacity: 0.3 },
                            isSelected && { backgroundColor: "#E7ECEA", borderRadius: 8 },
                          ]}
                          onPress={() => {
                            if (isValid) {
                              setEditDate(date);
                              setEditSlot(null);
                            }
                          }}
                          disabled={!isValid}
                        >
                          <Text style={[styles.gridDay, isSelected && { fontWeight: "800" }]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    }

                    return cells;
                  })()}
                </View>

                                  {/* Available slots section */}
                <View style={{ marginTop: 16, paddingBottom: 12 }}>
                  <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 10 }]}>
                    {editDate ? `Slots on ${fmtDateShort(editDate)}` : "Select a date"}
                  </Text>
                  {!editDate ? (
                    <Text style={{ color: COLORS.dim, fontSize: 13 }}>Pick a date to see available slots.</Text>
                  ) : availableSlotsForEditDate.length === 0 ? (
                    <Text style={{ color: COLORS.dim, fontSize: 13 }}>No free slots on this date.</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {availableSlotsForEditDate.map((s) => {
                        const chosen = editSlot && editSlot.startTime === s.startTime && editSlot.endTime === s.endTime;
                        return (
                          <TouchableOpacity
                            key={`${s.startTime}-${s.endTime}`}
                            onPress={() => {
                              setEditSlot(s);
                              setShowCustomTimeOption(false);
                              setCustomStartTime("");
                              setCustomEndTime("");
                            }}
                            style={[
                              styles.editSlotCard,
                              chosen && { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
                            ]}
                          >
                            <Text style={[styles.editSlotText, chosen && { color: "white" }]}>
                              {s.startTime} – {s.endTime}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Custom Time Slot Option */}
                  {editDate && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line }}>
                      <TouchableOpacity
                        onPress={() => {
                          const newState = !showCustomTimeOption;
                          setShowCustomTimeOption(newState);
                          if (newState) {
                            setEditSlot(null);
                            const ranges = findAvailableTimeRanges(editDate);
                            setAvailableTimeRanges(ranges);
                          } else {
                            setCustomStartTime("");
                            setCustomEndTime("");
                          }
                        }}
                        style={{ paddingVertical: 8 }}
                      >
                        <Text style={{ color: COLORS.accent, fontWeight: "700", fontSize: 14 }}>
                          {showCustomTimeOption ? "− Hide" : "+ Book"} custom time slot
                        </Text>
                      </TouchableOpacity>

                      {showCustomTimeOption && (
                        <View style={styles.customTimeContainer}>
                          <Text style={styles.customTimeTitle}>Custom Time Slot</Text>

                          <View style={styles.availableTimeContainer}>
                            <Text style={styles.availableTimeLabel}>Available Time Today:</Text>
                            {availableTimeRanges.map((range, idx) => (
                              <Text key={idx} style={styles.availableTimeText}>{range}</Text>
                            ))}
                          </View>

                          <View style={{ marginBottom: 12 }}>
                            <Text style={styles.inputLabel}>Start Time</Text>
                            <View style={styles.pickerContainer}>
                              <ScrollView style={styles.timePicker} nestedScrollEnabled>
                                {generateTimeOptions().map(time => (
                                  <TouchableOpacity
                                    key={time}
                                    onPress={() => {
                                      setCustomStartTime(time);
                                      if (selectedEdit) {
                                        const duration = getServiceDuration(selectedEdit.serviceCode);
                                        const end = calculateEndTime(time, duration);
                                        setCustomEndTime(end);
                                      }
                                    }}
                                    style={[
                                      styles.timeOption,
                                      customStartTime === time && styles.timeOptionSelected
                                    ]}
                                  >
                                    <Text style={[
                                      styles.timeOptionText,
                                      customStartTime === time && styles.timeOptionTextSelected
                                    ]}>
                                      {time}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          </View>

                          <View style={{ marginBottom: 12 }}>
                            <Text style={styles.inputLabel}>End Time (Auto-calculated)</Text>
                            <View style={styles.disabledInput}>
                              <Text style={{ color: COLORS.dim }}>
                                {customEndTime || "Will be calculated automatically"}
                              </Text>
                            </View>
                          </View>

                          {customStartTime && customEndTime && selectedEdit && (
                            <Text style={{ fontSize: 12, color: COLORS.dim, marginTop: 8 }}>
                              Duration: {getServiceDuration(selectedEdit.serviceCode)} minutes
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleCancelClick(selectedEdit)}
                    style={[styles.secondary, { flex: 1 }]}
                  >
                    <Text style={styles.secondaryText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={submitEdit}
                    disabled={
                      submitting ||
                      (!showCustomTimeOption && !editSlot) ||
                      (showCustomTimeOption && !customStartTime)
                    }
                    style={[styles.cta, { flex: 1 }, (submitting || (!showCustomTimeOption && !editSlot) || (showCustomTimeOption && !customStartTime)) && { opacity: 0.6 }]}
                  >
                    <Text style={styles.ctaText}>{submitting ? "Saving…" : "Save Changes"}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={showDeleteConfirm}
        appointment={deletingAppointment}
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </View>
  );
}

// -------------------- Delete Confirmation Modal --------------------
function DeleteConfirmModal({
  visible,
  appointment,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  visible: boolean;
  appointment: UiApt | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!appointment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { maxWidth: 400 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Cancellation</Text>
          </View>

          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: COLORS.text, marginBottom: 12 }}>
              Are you sure you want to cancel this appointment?
            </Text>

            <View style={styles.deleteAppointmentInfo}>
              <Text style={styles.deleteAppointmentTitle}>
                {appointment.serviceCode}
              </Text>
              <Text style={styles.deleteAppointmentDetails}>
                {fmtDateShort(appointment.dateObj)} at {appointment.startTime}
              </Text>
              <Text style={styles.deleteAppointmentDetails}>
                Duration: {appointment.duration} minutes
              </Text>
            </View>

            <Text style={{ color: COLORS.dim, fontSize: 12, marginTop: 12 }}>
              This action cannot be undone.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isDeleting}
              style={[styles.secondary, { flex: 1 }]}
            >
              <Text style={styles.secondaryText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isDeleting}
              style={[styles.deleteBtn, { flex: 1 }, isDeleting && { opacity: 0.6 }]}
            >
              <Text style={styles.deleteBtnText}>
                {isDeleting ? "Cancelling..." : "Cancel Appointment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -------------------- Calendar (ALL months) --------------------
function CalendarAllMonths({
  months,
  apptsByDay,
  onPressAppt,
  onPressEdit,
  getPatientName,
}: {
  months: { y: number; m: number; key: string; title: string }[];
  apptsByDay: Record<string, UiApt[]>;
  onPressAppt: (a: UiApt) => void;
  onPressEdit: (a: UiApt) => void;
  getPatientName: (clientId?: string) => string;
}) {
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewRef = useRef((viewableItems: any) => {
    if (viewableItems.viewableItems.length > 0) {
      const newIndex = viewableItems.viewableItems[0].index;
      if (newIndex !== index && newIndex !== null) {
        setIndex(newIndex);
      }
    }
  });

  const go = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(months.length - 1, index + dir));
    if (next !== index) {
      setIndex(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  if (months.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={{ color: COLORS.dim }}>No months to display.</Text>
        </View>
      </View>
    );
  }

  const currentMonth = months[index] || months[0];

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => go(-1)} disabled={index === 0} style={[styles.navBtn, index === 0 && { opacity: 0.4 }]}>
          <Text style={styles.navBtnText}>◀</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { textAlign: "center" }]}>{currentMonth?.title || "—"}</Text>
        <TouchableOpacity
          onPress={() => go(1)}
          disabled={index === months.length - 1}
          style={[styles.navBtn, index === months.length - 1 && { opacity: 0.4 }]}
        >
          <Text style={styles.navBtnText}>▶</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={months}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, alignItems: "center" }}>
            <MonthCard
              year={item.y}
              monthIndex={item.m}
              apptsByDay={apptsByDay}
              onPressAppt={onPressAppt}
              onPressEdit={onPressEdit}
              getPatientName={getPatientName}
            />
          </View>
        )}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}
function MonthCard({
  year,
  monthIndex,
  apptsByDay,
  onPressAppt,
  onPressEdit,
  getPatientName,
}: {
  year: number;
  monthIndex: number;
  apptsByDay: Record<string, UiApt[]>;
  onPressAppt: (a: UiApt) => void;
  onPressEdit: (a: UiApt) => void;
  getPatientName: (clientId?: string) => string;
}) {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const [selected, setSelected] = useState<Date | null>(null);
  const [showApptModal, setShowApptModal] = useState(false);
  const selectedKey = selected ? toDMY(selected) : null;
  const list = selectedKey ? apptsByDay[selectedKey] ?? [] : [];

  const handleDatePress = (date: Date) => {
    const key = toDMY(date);
    const dayApts = apptsByDay[key] ?? [];
    
    if (dayApts.length > 0) {
      setSelected(date);
      setShowApptModal(true);
    }
  };

  return (
    <>
      <View style={[styles.card, { width: 360, height: 380 }]}>
        {/* Week header */}
        <View style={styles.weekHeader}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={styles.weekHdrText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {Array.from({ length: startWeekday }).map((_, i) => (
            <View key={`lead-${i}`} style={styles.gridCell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const d = new Date(year, monthIndex, idx + 1);
            const key = toDMY(d);
            const dayApts = apptsByDay[key] ?? [];
            
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.gridCell,
                  dayApts.length > 0 && { backgroundColor: "#EAF1EE" }
                ]}
                onPress={() => handleDatePress(d)}
                disabled={dayApts.length === 0}
              >
                <Text style={[
                  styles.gridDay,
                  dayApts.length > 0 && { fontWeight: "800", color: COLORS.accent }
                ]}>{idx + 1}</Text>
                {dayApts.length > 0 && (
                  <View style={styles.dayApptDotRow}>
                    {dayApts.slice(0, 3).map((apt, i) => (
                      <View
                        key={i}
                        style={[styles.dayApptDot, { backgroundColor: codeColor(apt.serviceCode) }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Helper text */}
        <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
          <Text style={{ color: COLORS.dim, fontSize: 13, textAlign: "center" }}>
            Tap on a highlighted date to view appointments
          </Text>
        </View>
      </View>

      {/* Appointments Modal */}
      <Modal
        visible={showApptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApptModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { maxWidth: 400, maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selected ? fmtDateShort(selected) : "Appointments"}
              </Text>
              <TouchableOpacity onPress={() => setShowApptModal(false)}>
                <Text style={{ fontWeight: "800", color: COLORS.dim, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ marginTop: 12 }}
              showsVerticalScrollIndicator={true}
            >
              {list.length === 0 ? (
                <Text style={{ color: COLORS.dim, textAlign: "center", padding: 20 }}>
                  No appointments on this day.
                </Text>
              ) : (
                list.map((item) => (
                  <View 
                    key={`${item.serviceCode}-${item.appointmentId}`} 
                    style={[styles.cardRow, { marginTop: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line }]}
                  >
                    <View style={[styles.dot, { backgroundColor: codeColor(item.serviceCode) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {item.serviceCode} • {getPatientName(item.clientId)}
                      </Text>
                      <Text style={styles.rowSub}>
                        {item.startTime}–{item.endTime} • {item.duration}m
                      </Text>
                      <Text style={styles.statusText}>
                        Status: <Text style={{ fontWeight: "800" }}>{item.status ?? "—"}</Text>
                      </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity 
                        onPress={() => {
                          setShowApptModal(false);
                          onPressAppt(item);
                        }} 
                        style={styles.ghostBtn}
                      >
                        <Text style={styles.ghostText}>Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          setShowApptModal(false);
                          onPressEdit(item);
                        }} 
                        style={styles.editBtn}
                      >
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowApptModal(false)}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// -------------------- Small UI bits --------------------
function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      <Text style={{ width: 110, color: COLORS.dim, fontWeight: "700" }}>{label}:</Text>
      <Text style={{ flex: 1, color: COLORS.text }}>{value ?? "—"}</Text>
    </View>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  tabsWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  tabs: {
    backgroundColor: "#E7ECEA",
    borderRadius: 12,
    flexDirection: "row",
    padding: 4,
    gap: 6,
    alignSelf: "flex-start",
  },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.card },
  tabText: { color: COLORS.dim, fontWeight: "700" },
  tabTextActive: { color: COLORS.text },
  sectionHeader: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  linkBtnText: { color: "white", fontWeight: "700" },
  reloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: "transparent",
  },
  reloadText: { color: COLORS.accent, fontWeight: "800" },
  metaText: { color: COLORS.dim, fontSize: 12, fontWeight: "600" },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF3F1",
  },
  navBtnText: { color: COLORS.text, fontWeight: "700" },
  monthHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  monthHeaderText: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.line },
  rowTitle: { fontWeight: "700", color: COLORS.text },
  rowSub: { color: COLORS.dim, marginTop: 2 },
  when: { color: COLORS.sage, fontWeight: "700" },
  slot: { color: COLORS.dim },
  statusText: { fontWeight: "600", color: COLORS.sage, fontSize: 12, marginTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 4 },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  calendarContainer: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthNavBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF3F1",
  },
  monthTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  editCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 8,
  },
 weekHeader: { 
  flexDirection: "row", 
  paddingHorizontal: 10, 
  paddingBottom: 6,
},
  weekHeaderRow: { flexDirection: "row", gap: 6 },
weekHdrText: { 
  color: COLORS.dim, 
  fontWeight: "700", 
  textAlign: "center", 
  width: "14.28%",  // Changed from flex: 1
  fontSize: 12
},
grid: { 
  paddingHorizontal: 10, 
  paddingBottom: 10, 
  flexDirection: "row",
  flexWrap: "wrap",
},
  weekRow: { flexDirection: "row", gap: 6 },
gridCell: {
  width: "14.28%",  // Changed from "13%"
  aspectRatio: 1,
  borderRadius: 8,  // Changed from 10
  backgroundColor: "#F4F6F5",
  padding: 4,  // Changed from 6
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 2,  // Added this
},
  dayCell: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 10,
    backgroundColor: "#F4F6F5",
    padding: 6,
    justifyContent: "space-between",
  },
  gridDay: { fontWeight: "800", color: COLORS.text, fontSize: 14 },
  dayCellDisabled: { opacity: 0.35 },
  daySelected: { backgroundColor: "#EAF1EE", borderWidth: 1, borderColor: COLORS.accent },
  dayNumber: { fontWeight: "800", color: COLORS.text },
  dayApptDotRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 2, 
    marginTop: 4,
    justifyContent: "center"
  },
  dayApptDot: { width: 5, height: 5, borderRadius: 2.5 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.dim, fontSize: 12, fontWeight: "600" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    width: "100%",
    maxWidth: 720,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  closeX: { fontWeight: "800", color: COLORS.dim },
  modalBody: { gap: 8, marginTop: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { width: 120, color: COLORS.dim, fontWeight: "700" },
  rowValue: { color: COLORS.text, flex: 1 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line, marginVertical: 10 },
  footerRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 10 },
  cta: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: { color: "white", fontWeight: "800" },
  ghostBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  ghostText: { color: COLORS.accent, fontWeight: "700", fontSize: 12 },
  editBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editText: { color: "white", fontWeight: "700", fontSize: 12 },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  secondaryText: { color: COLORS.accent, fontWeight: "800" },
  formRow: { marginTop: 8 },
  formLabel: { color: COLORS.dim, fontWeight: "700", marginBottom: 6 },
  inputRow: {
    backgroundColor: "#F4F6F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1E5E3",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
 
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF3F1",
  },
  pillText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#F9FBFA",
  },
  slotText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  slotPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#F9FBFA",
  },
  slotPillActive: { borderColor: COLORS.accent, backgroundColor: "#EAF1EE" },
  slotPillText: { color: COLORS.text, fontWeight: "700" },
  slotPillTextDisabled: { color: COLORS.dim },
  editFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveText: { color: "white", fontWeight: "800" },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelText: { color: COLORS.accent, fontWeight: "800" },
  scrollContent: { paddingBottom: 24 },

  // Edit modal slot card style
  editSlotCard: {
    backgroundColor: "#F4F6F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  editSlotText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },

  // Custom time slot styles
  customTimeContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FBFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  customTimeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  availableTimeContainer: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 12,
  },
  availableTimeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 8,
  },
  availableTimeText: {
    fontSize: 12,
    color: "#16a34a",
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    maxHeight: 150,
  },
  timePicker: {
    maxHeight: 150,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.accent,
  },
  timeOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeOptionTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  disabledInput: {
    backgroundColor: "#F4F6F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
     opacity: 0.6
  },

  // Delete confirmation styles
  deleteAppointmentInfo: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteAppointmentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 4,
  },
  deleteAppointmentDetails: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteBtnText: {
    color: "white",
    fontWeight: "800",
    textAlign: "center",
  },
});