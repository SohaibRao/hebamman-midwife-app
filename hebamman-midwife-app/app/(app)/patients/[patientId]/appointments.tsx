// app/(app)/patients/appointments.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { useAuth } from "@/context/AuthContext";

// -------------------- Theme --------------------
const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  green: "#22C55E",
  line: "#E5E7EB",
};

// -------------------- Types --------------------
type Apt = {
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status?: string;
  serviceCode: string;
  classNo?: string;
  dateObj: Date;
  midwifeId: string;
  clientId: string;
};

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type Timetable = {
  [weekday: string]: {
    slots: {
      [serviceCode: string]: TimeSlot[];
    };
  };
};

type Tab = "list" | "calendar";

// Service colors
const SERVICE_COLORS: Record<string, string> = {
  B1: "#2563eb",
  B2: "#0ea5e9",
  E1: "#f59e0b",
  C1: "#16a34a",
  C2: "#10b981",
  D1: "#ef4444",
  D2: "#f97316",
  F1: "#a855f7",
};

const SERVICE_NAMES: Record<string, string> = {
  B1: "Pre Birth Visit",
  B2: "Pre Birth Video",
  E1: "Birth Training",
  C1: "Early Care Visit",
  C2: "Early Care Video",
  D1: "Late Care Visit",
  D2: "Late Care Video",
  F1: "After Birth Gym",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// -------------------- Helpers --------------------
const toDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((n) => parseInt(n, 10));
  return new Date(yyyy, mm - 1, dd);
};

const toDMY = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const monthTitle = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const weekdayName = (d: Date) => DAY_NAMES[d.getDay()];

const codeColor = (code: string) => SERVICE_COLORS[code] ?? COLORS.sage;

// Get status badge style
const getStatusBadgeStyle = (status?: string) => {
  const normalizedStatus = status?.toLowerCase() || "active";
  
  const styles: Record<string, any> = {
    active: {
      backgroundColor: "#D1FAE5",
      color: "#065F46",
    },
    pending: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    },
    cancelled: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
    },
  };
  
  return styles[normalizedStatus] || styles.active;
};

const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

async function readJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

const getServiceDuration = (code: string): number => {
  const durations: Record<string, number> = {
    B1: 60, B2: 50, C1: 60, C2: 25, D1: 60, D2: 25, E1: 140, F1: 75,
  };
  return durations[code] || 60;
};

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

// -------------------- Main Component --------------------
export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = pf.data as any;
  const timetable: Timetable | undefined = midwifeProfile?.identity?.timetable;
  
  const clientId = params.clientId as string;
  const midwifeId = params.midwifeId as string;
  const patientName = params.patientName as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  
  const [preBirthApts, setPreBirthApts] = useState<Apt[]>([]);
  const [postBirthApts, setPostBirthApts] = useState<Apt[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDetails, setSelectedDetails] = useState<Apt | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Calendar selection
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  
  // Create states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createServiceCode, setCreateServiceCode] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createTimeSlot, setCreateTimeSlot] = useState<TimeSlot | null>(null);
  const [showCreateCustomTime, setShowCreateCustomTime] = useState(false);
  const [createCustomStart, setCreateCustomStart] = useState("");
  const [createCustomEnd, setCreateCustomEnd] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createCalendarDate, setCreateCalendarDate] = useState(new Date());

  // Edit states
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState<Apt | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editTimeSlot, setEditTimeSlot] = useState<TimeSlot | null>(null);
  const [showEditCustomTime, setShowEditCustomTime] = useState(false);
  const [editCustomStart, setEditCustomStart] = useState("");
  const [editCustomEnd, setEditCustomEnd] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editCalendarDate, setEditCalendarDate] = useState(new Date());

  // Cancel appointment states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] = useState<Apt | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // Reactivate appointment states
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivatingAppointment, setReactivatingAppointment] = useState<Apt | null>(null);
  const [reactivateDate, setReactivateDate] = useState<Date | null>(null);
  const [reactivateSlot, setReactivateSlot] = useState<TimeSlot | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateCalendarMonth, setReactivateCalendarMonth] = useState<Date>(new Date());

  // All appointments
  const allAppointments = useMemo(() => {
    const all = [...preBirthApts, ...postBirthApts];
    all.sort((a, b) => {
      const d = a.dateObj.getTime() - b.dateObj.getTime();
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });
    return all;
  }, [preBirthApts, postBirthApts]);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    if (!midwifeId || !clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const preRes = await api(
        `/api/public/PreBirthAppointments/clientAppointment?midwifeId=${midwifeId}&clientId=${clientId}`
      );
      const preJson = await readJsonSafe<any>(preRes);
      
      const postRes = await api(
        `/api/public/PostBirthAppointments/clientAppointment?midwifeId=${midwifeId}&clientId=${clientId}`
      );
      const postJson = await readJsonSafe<any>(postRes);
      
      const preApts: Apt[] = [];
      if (preJson.success && preJson.data?.appointments) {
        Object.entries(preJson.data.appointments).forEach(([serviceCode, apts]: [string, any]) => {
          if (Array.isArray(apts)) {
            apts.forEach((apt: any) => {
              preApts.push({
                appointmentId: apt.appointmentId,
                appointmentDate: apt.appointmentDate,
                startTime: apt.startTime,
                endTime: apt.endTime,
                duration: apt.duration,
                status: apt.status,
                serviceCode,
                classNo: apt.classNo,
                dateObj: toDate(apt.appointmentDate),
                midwifeId,
                clientId,
              });
            });
          }
        });
      }
      
      const postApts: Apt[] = [];
      if (postJson.success && postJson.data?.appointments) {
        Object.entries(postJson.data.appointments).forEach(([serviceCode, apts]: [string, any]) => {
          if (Array.isArray(apts)) {
            apts.forEach((apt: any) => {
              postApts.push({
                appointmentId: apt.appointmentId,
                appointmentDate: apt.appointmentDate,
                startTime: apt.startTime,
                endTime: apt.endTime,
                duration: apt.duration,
                status: apt.status,
                serviceCode,
                classNo: apt.classNo,
                dateObj: toDate(apt.appointmentDate),
                midwifeId,
                clientId,
              });
            });
          }
        });
      }
      
      setPreBirthApts(preApts);
      setPostBirthApts(postApts);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [midwifeId, clientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Calculate status counts for current month
  const statusCounts = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const monthApts = allAppointments.filter(apt => apt.dateObj >= start && apt.dateObj <= end);
    
    return {
      all: monthApts.length,
      active: monthApts.filter((a) => {
        const status = a.status?.toLowerCase() || "active";
        return status === "active";
      }).length,
      pending: monthApts.filter((a) => {
        const status = a.status?.toLowerCase() || "active";
        return status === "pending";
      }).length,
      cancelled: monthApts.filter((a) => {
        const status = a.status?.toLowerCase() || "active";
        return status === "cancelled";
      }).length,
    };
  }, [allAppointments, currentDate]);

  // Month appointments with status filter
  const monthAppointments = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    let filtered = allAppointments.filter(apt => apt.dateObj >= start && apt.dateObj <= end);
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const aptStatus = a.status?.toLowerCase() || "active";
        return aptStatus === statusFilter;
      });
    }
    
    return filtered;
  }, [allAppointments, currentDate, statusFilter]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startWeekday = start.getDay();
    const daysInMonth = end.getDate();
    const days: Date[] = [];
    
    for (let i = 0; i < startWeekday; i++) {
      days.push(new Date(0));
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    
    return days;
  }, [currentDate]);

  const apptsByDay = useMemo(() => {
    const map: Record<string, Apt[]> = {};
    allAppointments.forEach(apt => {
      const key = toDMY(apt.dateObj);
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [allAppointments]);

  // Selected calendar date appointments
  const selectedDayAppointments = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const key = toDMY(selectedCalendarDate);
    return apptsByDay[key] ?? [];
  }, [selectedCalendarDate, apptsByDay]);

  // Available service codes (F1 excluded from creation)
  const availableServiceCodes = ["B1", "B2", "C1", "C2", "D1", "D2"];

  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return times;
  };

  // Check if date is available based on timetable
  const isDateAvailable = useCallback((date: Date, serviceCode: string): boolean => {
    if (!timetable) return false;
    const dayName = weekdayName(date);
    const daySlots = timetable[dayName];
    if (!daySlots?.slots?.[serviceCode]) return false;
    return daySlots.slots[serviceCode].length > 0;
  }, [timetable]);

  // Get available time slots for a date
  const getAvailableTimeSlots = useCallback((date: Date, serviceCode: string): TimeSlot[] => {
    if (!timetable) return [];
    const dayName = weekdayName(date);
    const daySlots = timetable[dayName];
    if (!daySlots?.slots?.[serviceCode]) return [];
    
    const slots = daySlots.slots[serviceCode] || [];
    const dateKey = toDMY(date);
    const bookedSlots = apptsByDay[dateKey] ?? [];
    
    // Filter out booked slots
    return slots.filter(slot => {
      return !bookedSlots.some(apt => 
        apt.startTime === slot.startTime && apt.endTime === slot.endTime
      );
    });
  }, [timetable, apptsByDay]);

  // Find available time ranges
  const findAvailableTimeRanges = useCallback((date: Date): string[] => {
    if (!timetable) return ["00:00 - 23:59 available"];

    const dayName = weekdayName(date);
    const daySlots = timetable[dayName];
    if (!daySlots?.slots) return ["00:00 - 23:59 available"];

    const busySlots: { start: number; end: number }[] = [];

    Object.values(daySlots.slots).forEach((serviceSlots: any) => {
      if (Array.isArray(serviceSlots)) {
        serviceSlots.forEach((slot: TimeSlot) => {
          busySlots.push({
            start: parseTime(slot.startTime),
            end: parseTime(slot.endTime)
          });
        });
      }
    });

    const dateKey = toDMY(date);
    const dayApts = apptsByDay[dateKey] ?? [];
    dayApts.forEach(apt => {
      busySlots.push({
        start: parseTime(apt.startTime),
        end: parseTime(apt.endTime)
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
          `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} available`
        );
      }
      currentTime = busy.end;
    });

    if (currentTime < 24 * 60) {
      const startHour = Math.floor(currentTime / 60);
      const startMin = currentTime % 60;
      freeRanges.push(
        `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')} - 23:59 available`
      );
    }

    return freeRanges.length > 0 ? freeRanges : ["No free time available"];
  }, [timetable, apptsByDay]);

  // Validate custom time
  const isCustomTimeValid = (startTime: string, endTime: string, date: Date): boolean => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (endMinutes <= startMinutes) {
      Alert.alert("Error", "End time must be after start time");
      return false;
    }

    const ranges = findAvailableTimeRanges(date);
    if (ranges[0] === "No free time available") {
      Alert.alert("Error", "No free time available on this date");
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

    Alert.alert("Error", "Selected time is not within available time ranges");
    return false;
  };

  const filterTimeOptionsByAvailableRanges = useCallback((ranges: string[], serviceCode: string): string[] => {
    if (ranges[0] === "No free time available") return [];
    
    const allTimes = generateTimeOptions();
    const availableTimes: string[] = [];
    
    ranges.forEach(range => {
      const match = range.match(/(\d{2}):(\d{2}) - (\d{2}):(\d{2})/);
      if (match) {
        const rangeStart = `${match[1]}:${match[2]}`;
        const rangeEnd = `${match[3]}:${match[4]}`;
        
        const startMinutes = parseTime(rangeStart);
        const endMinutes = parseTime(rangeEnd);
        
        allTimes.forEach(time => {
          const timeMinutes = parseTime(time);
          const duration = getServiceDuration(serviceCode);
          const endTimeMinutes = timeMinutes + duration;
          
          if (timeMinutes >= startMinutes && endTimeMinutes <= endMinutes) {
            availableTimes.push(time);
          }
        });
      }
    });
    
    return availableTimes;
  }, []);

  // Generate calendar days for modals
  const getCalendarDays = (month: Date) => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startWeekday = start.getDay();
    const daysInMonth = end.getDate();
    const arr: Date[] = [];
    
    for (let i = 0; i < startWeekday; i++) arr.push(new Date(0));
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(month.getFullYear(), month.getMonth(), i));
    }
    
    return arr;
  };

  // Available time slots for edit
  const editAvailableSlots = useMemo(() => {
    if (!selectedEdit || !editDate) return [];
    return getAvailableTimeSlots(editDate, selectedEdit.serviceCode);
  }, [selectedEdit, editDate, getAvailableTimeSlots]);

  // Available time slots for create
  const createAvailableSlots = useMemo(() => {
    if (!createServiceCode || !createDate) return [];
    return getAvailableTimeSlots(createDate, createServiceCode);
  }, [createServiceCode, createDate, getAvailableTimeSlots]);

  // Available time slots for reactivate
  const reactivateAvailableSlots = useMemo(() => {
    if (!reactivatingAppointment || !reactivateDate) return [];
    return getAvailableTimeSlots(reactivateDate, reactivatingAppointment.serviceCode);
  }, [reactivatingAppointment, reactivateDate, getAvailableTimeSlots]);

  // Handlers
  const openDetails = (apt: Apt) => {
    setSelectedDetails(apt);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedDetails(null);
  };

  const openEdit = (apt: Apt) => {
    setSelectedEdit(apt);
    setEditDate(apt.dateObj);
    setEditTimeSlot({ startTime: apt.startTime, endTime: apt.endTime });
    setEditCalendarDate(new Date(apt.dateObj.getFullYear(), apt.dateObj.getMonth(), 1));
    setShowEditCustomTime(false);
    setEditCustomStart("");
    setEditCustomEnd("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setSelectedEdit(null);
    setEditDate(null);
    setEditTimeSlot(null);
    setShowEditCustomTime(false);
    setEditCustomStart("");
    setEditCustomEnd("");
  };

  const submitEdit = async () => {
    if (!selectedEdit || !editDate) {
      Alert.alert("Error", "Please select a date");
      return;
    }

    let startTime: string;
    let endTime: string;

    if (showEditCustomTime) {
      if (!editCustomStart || !editCustomEnd) {
        Alert.alert("Error", "Please select start time");
        return;
      }
      if (!isCustomTimeValid(editCustomStart, editCustomEnd, editDate)) return;
      startTime = editCustomStart;
      endTime = editCustomEnd;
    } else {
      if (!editTimeSlot) {
        Alert.alert("Error", "Please select a time slot");
        return;
      }
      startTime = editTimeSlot.startTime;
      endTime = editTimeSlot.endTime;
    }

    setIsUpdating(true);
    try {
      const payload = {
        midwifeId,
        clientId,
        serviceCode: selectedEdit.serviceCode,
        appointmentId: selectedEdit.appointmentId,
        updatedDate: toDMY(editDate),
        updatedStartTime: startTime,
        updatedEndTime: endTime,
      };

      const res = await api(`/api/public/changeAppointmentSlots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await readJsonSafe<any>(res);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to update");

      await fetchAppointments();
      closeEdit();
      closeDetails();
      Alert.alert("Success", "Appointment updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to update appointment");
    } finally {
      setIsUpdating(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateServiceCode(null);
    setCreateDate(null);
    setCreateTimeSlot(null);
    setShowCreateCustomTime(false);
    setCreateCustomStart("");
    setCreateCustomEnd("");
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateServiceCode(null);
    setCreateDate(null);
    setCreateTimeSlot(null);
    setShowCreateCustomTime(false);
    setCreateCustomStart("");
    setCreateCustomEnd("");
  };

  const submitCreate = async () => {
    if (!createServiceCode || !createDate) {
      Alert.alert("Error", "Please complete all fields");
      return;
    }

    let startTime: string;
    let endTime: string;

    if (showCreateCustomTime) {
      if (!createCustomStart || !createCustomEnd) {
        Alert.alert("Error", "Please select start time");
        return;
      }
      if (!isCustomTimeValid(createCustomStart, createCustomEnd, createDate)) return;
      startTime = createCustomStart;
      endTime = createCustomEnd;
    } else {
      if (!createTimeSlot) {
        Alert.alert("Error", "Please select a time slot");
        return;
      }
      startTime = createTimeSlot.startTime;
      endTime = createTimeSlot.endTime;
    }

    setIsCreating(true);
    try {
      const payload = {
        serviceCode: createServiceCode,
        clientId,
        midwifeId,
        appointmentDate: toDMY(createDate),
        startTime,
        endTime,
      };

      const res = await api(`/api/public/createAppointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await readJsonSafe<any>(res);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to create");

      await fetchAppointments();
      closeCreateModal();
      Alert.alert("Success", "Appointment created successfully!");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create appointment");
    } finally {
      setIsCreating(false);
    }
  };

  // Cancel appointment handlers
  const handleCancelAppointment = async () => {
    if (!cancelingAppointment) return;
    
    setIsCanceling(true);
    
    try {
      const body: any = {
        appointmentId: cancelingAppointment.appointmentId,
        serviceCode: cancelingAppointment.serviceCode,
        midwifeId: cancelingAppointment.midwifeId,
        clientId: cancelingAppointment.clientId,
      };

      const response = await api("/api/public/cancelAppointment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(
          "Success",
          result.message || "Appointment cancelled successfully"
        );
        
        setShowCancelConfirm(false);
        setCancelingAppointment(null);
        closeDetails();
        closeEdit();
        
        await fetchAppointments();
      } else {
        Alert.alert(
          "Error",
          result.error || result.details || "Failed to cancel appointment"
        );
      }
    } catch (error: any) {
      console.error("Cancel appointment error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  const openCancelConfirm = (apt: Apt) => {
    setCancelingAppointment(apt);
    setShowCancelConfirm(true);
  };

  const closeCancelConfirm = () => {
    if (!isCanceling) {
      setShowCancelConfirm(false);
      setCancelingAppointment(null);
    }
  };

  // Reactivate appointment handlers
  const openReactivateModal = (apt: Apt) => {
    setReactivatingAppointment(apt);
    const aptDate = toDate(apt.appointmentDate);
    setReactivateDate(aptDate);
    setReactivateCalendarMonth(new Date(aptDate.getFullYear(), aptDate.getMonth(), 1));
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
        midwifeId: reactivatingAppointment.midwifeId,
        clientId: reactivatingAppointment.clientId,
      };

      const response = await api("/api/public/reactivateAppointment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(
          "Success",
          result.message || "Appointment reactivated successfully"
        );

        setShowReactivateModal(false);
        setReactivatingAppointment(null);
        setReactivateDate(null);
        setReactivateSlot(null);
        closeDetails();

        await fetchAppointments();
      } else {
        Alert.alert(
          "Error",
          result.error || result.details || "Failed to reactivate appointment"
        );
      }
    } catch (error: any) {
      console.error("Reactivate appointment error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsReactivating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: 8, color: COLORS.dim }}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{patientName}</Text>
        <Text style={styles.subtitle}>{allAppointments.length} appointments</Text>
        
        <TouchableOpacity onPress={openCreateModal} style={styles.createBtn}>
          <Text style={styles.createBtnText}>+ New Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setTab("list")}
            style={[styles.tabBtn, tab === "list" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "list" && styles.tabTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("calendar")}
            style={[styles.tabBtn, tab === "calendar" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "calendar" && styles.tabTextActive]}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: "crimson" }}>{error}</Text>
        </View>
      )}

      {tab === "list" ? (
        <>
          {/* Status Filter */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.card }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.dim, marginBottom: 8 }}>
              Filter by Status
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setStatusFilter("all")}
                  style={[
                    styles.filterBtn,
                    statusFilter === "all" && styles.filterBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.filterBtnText,
                    statusFilter === "all" && styles.filterBtnTextActive,
                  ]}>
                    All ({statusCounts.all})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setStatusFilter("active")}
                  style={[
                    styles.filterBtn,
                    statusFilter === "active" && styles.filterBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.filterBtnText,
                    statusFilter === "active" && styles.filterBtnTextActive,
                  ]}>
                    Active ({statusCounts.active})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setStatusFilter("pending")}
                  style={[
                    styles.filterBtn,
                    statusFilter === "pending" && styles.filterBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.filterBtnText,
                    statusFilter === "pending" && styles.filterBtnTextActive,
                  ]}>
                    Pending ({statusCounts.pending})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setStatusFilter("cancelled")}
                  style={[
                    styles.filterBtn,
                    statusFilter === "cancelled" && styles.filterBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.filterBtnText,
                    statusFilter === "cancelled" && styles.filterBtnTextActive,
                  ]}>
                    Cancelled ({statusCounts.cancelled})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthTitle(currentDate)}</Text>
            <TouchableOpacity
              onPress={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={monthAppointments}
            keyExtractor={(item) => item.appointmentId}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={
              <View style={[styles.center, { padding: 24 }]}>
                <Text style={{ color: COLORS.dim }}>No appointments this month</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openDetails(item)} style={styles.aptCard}>
                <View style={[styles.colorDot, { backgroundColor: codeColor(item.serviceCode) }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={styles.aptTitle}>
                      {item.serviceCode} • {SERVICE_NAMES[item.serviceCode]}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadgeStyle(item.status).backgroundColor }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: getStatusBadgeStyle(item.status).color }
                      ]}>
                        {(item.status || "active").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.aptSub}>
                    {fmtDateShort(item.dateObj)} • {item.startTime}–{item.endTime} • {item.duration}m
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <ScrollView>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthTitle(currentDate)}</Text>
            <TouchableOpacity
              onPress={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              style={styles.navBtn}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <View style={styles.calGrid}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={styles.calHeader}>{d}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calendarDays.map((d, idx) => {
                if (d.getTime() === 0) return <View key={idx} style={styles.calCell} />;
                
                const key = toDMY(d);
                const apts = apptsByDay[key] ?? [];
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                const isSelected = selectedCalendarDate && sameDay(d, selectedCalendarDate);
                
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedCalendarDate(d)}
                    style={[
                      styles.calCell,
                      !isCurrentMonth && { opacity: 0.3 },
                      isSelected && styles.calCellSelected
                    ]}
                  >
                    <Text style={[styles.calDay, isSelected && { color: "white" }]}>{d.getDate()}</Text>
                    {apts.slice(0, 2).map((apt, i) => (
                      <View
                        key={i}
                        style={[styles.calApt, { backgroundColor: codeColor(apt.serviceCode) }]}
                      >
                        <Text style={styles.calAptText}>{apt.serviceCode}</Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected day appointments */}
            {selectedCalendarDate && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>
                  Appointments on {fmtDateShort(selectedCalendarDate)}
                </Text>
                {selectedDayAppointments.length === 0 ? (
                  <Text style={{ color: COLORS.dim, marginTop: 8 }}>No appointments</Text>
                ) : (
                  selectedDayAppointments.map((item) => (
                    <TouchableOpacity
                      key={item.appointmentId}
                      onPress={() => openDetails(item)}
                      style={[styles.aptCard, { marginTop: 8 }]}
                    >
                      <View style={[styles.colorDot, { backgroundColor: codeColor(item.serviceCode) }]} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Text style={styles.aptTitle}>
                            {item.serviceCode} • {SERVICE_NAMES[item.serviceCode]}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusBadgeStyle(item.status).backgroundColor }
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              { color: getStatusBadgeStyle(item.status).color }
                            ]}>
                              {(item.status || "active").toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.aptSub}>
                          {item.startTime}–{item.endTime} • {item.duration}m
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

{/* Details Modal */}
<Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
  <View style={styles.overlay}>
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Appointment Details</Text>
        <TouchableOpacity onPress={closeDetails}>
          <Text style={{ fontSize: 20, color: COLORS.dim, fontWeight: "800" }}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {selectedDetails && (
        <>
          <DetailRow label="Service" value={`${selectedDetails.serviceCode} - ${SERVICE_NAMES[selectedDetails.serviceCode]}`} />
          <DetailRow label="Date" value={selectedDetails.appointmentDate} />
          <DetailRow label="Time" value={`${selectedDetails.startTime} – ${selectedDetails.endTime}`} />
          <DetailRow label="Duration" value={`${selectedDetails.duration} min`} />
          <DetailRow label="Status" value={selectedDetails.status ?? "—"} />
          
          {selectedDetails.status?.toLowerCase() === "cancelled" ? (
            // Show Reactivate button for cancelled appointments
            <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  closeDetails();
                  if (selectedDetails) openReactivateModal(selectedDetails);
                }}
                style={[styles.modalBtn, { flex: 1, backgroundColor: "#16a34a" }]}
              >
                <Text style={styles.modalBtnText}>Reactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={closeDetails} 
                style={[styles.modalBtnSecondary, { flex: 1 }]}
              >
                <Text style={styles.modalBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Show Edit and Cancel buttons for non-cancelled appointments
            <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  const s = selectedDetails;
                  closeDetails();
                  openEdit(s);
                }}
                style={[styles.modalBtn, { flex: 1 }]}
              >
                <Text style={styles.modalBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  closeDetails();
                  if (selectedDetails) openCancelConfirm(selectedDetails);
                }}
                style={[styles.cancelBtn, { flex: 1 }]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  </View>
</Modal>

{/* Cancel Confirmation Modal */}
<Modal
  visible={showCancelConfirm}
  transparent
  animationType="fade"
  onRequestClose={closeCancelConfirm}
>
  <View style={styles.overlay}>
    <View style={[styles.modalCard, { maxWidth: 400 }]}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Cancel Appointment</Text>
      </View>

      {cancelingAppointment && (
        <>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: COLORS.text, marginBottom: 16, fontSize: 15 }}>
              Are you sure you want to cancel this appointment?
            </Text>

            <View style={styles.cancelAppointmentInfo}>
              <Text style={styles.cancelAppointmentTitle}>
                {SERVICE_NAMES[cancelingAppointment.serviceCode] || cancelingAppointment.serviceCode}
              </Text>
              <Text style={styles.cancelAppointmentDetails}>
                Date: {cancelingAppointment.appointmentDate}
              </Text>
              <Text style={styles.cancelAppointmentDetails}>
                Time: {cancelingAppointment.startTime} - {cancelingAppointment.endTime}
              </Text>
              <Text style={styles.cancelAppointmentDetails}>
                Duration: {cancelingAppointment.duration} minutes
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ This action cannot be undone
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={closeCancelConfirm}
              disabled={isCanceling}
              style={[styles.modalBtnSecondary, { flex: 1 }]}
            >
              <Text style={styles.modalBtnSecondaryText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancelAppointment}
              disabled={isCanceling}
              style={[styles.cancelBtn, { flex: 1 }, isCanceling && { opacity: 0.6 }]}
            >
              {isCanceling ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>
                  Yes, Cancel It
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  </View>
</Modal>

{/* Reactivate Appointment Modal */}
<Modal
  visible={showReactivateModal}
  transparent
  animationType="fade"
  onRequestClose={closeReactivateModal}
>
  <View style={styles.overlay}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
      <View style={[styles.modalCard, { maxHeight: '90%', maxWidth: 400 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Reactivate & Reschedule {reactivatingAppointment?.serviceCode}
          </Text>
          <TouchableOpacity onPress={closeReactivateModal}>
            <Text style={{ fontWeight: "800", color: COLORS.dim, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {reactivatingAppointment && (
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {/* Info text */}
            <View style={{ 
              backgroundColor: "#DBEAFE", 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 16 
            }}>
              <Text style={{ color: "#1E40AF", fontSize: 13, fontWeight: "600" }}>
                Select a new date and time to reactivate this appointment
              </Text>
            </View>

            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={() => setReactivateCalendarMonth(
                  new Date(reactivateCalendarMonth.getFullYear(), reactivateCalendarMonth.getMonth() - 1, 1)
                )}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {monthTitle(reactivateCalendarMonth)}
              </Text>
              <TouchableOpacity
                onPress={() => setReactivateCalendarMonth(
                  new Date(reactivateCalendarMonth.getFullYear(), reactivateCalendarMonth.getMonth() + 1, 1)
                )}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Week header */}
            <View style={styles.calGrid}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={styles.calHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calGrid}>
              {getCalendarDays(reactivateCalendarMonth).map((d, idx) => {
                if (d.getTime() === 0) return <View key={idx} style={styles.calCell} />;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                d.setHours(0, 0, 0, 0);
                
                const isAvailable = isDateAvailable(d, reactivatingAppointment.serviceCode) && d >= today;
                const isSelected = reactivateDate && sameDay(d, reactivateDate);
                
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => isAvailable && setReactivateDate(d)}
                    disabled={!isAvailable}
                    style={[
                      styles.calCell,
                      !isAvailable && { opacity: 0.3 },
                      isSelected && styles.calCellSelected
                    ]}
                  >
                    <Text style={[styles.calDay, isSelected && { color: "white", fontWeight: "800" }]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Available slots */}
            {reactivateDate && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Available Time Slots</Text>
                {reactivateAvailableSlots.length > 0 ? (
                  <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                    {reactivateAvailableSlots.map((slot, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setReactivateSlot(slot)}
                        style={[
                          styles.timeOption,
                          reactivateSlot?.startTime === slot.startTime && 
                          reactivateSlot?.endTime === slot.endTime && 
                          styles.timeOptionActive
                        ]}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          reactivateSlot?.startTime === slot.startTime && 
                          reactivateSlot?.endTime === slot.endTime && 
                          styles.timeOptionTextActive
                        ]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={{ color: COLORS.dim, marginTop: 8 }}>No available slots</Text>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={closeReactivateModal}
                disabled={isReactivating}
                style={[styles.modalBtnSecondary, { flex: 1 }]}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReactivateAppointment}
                disabled={isReactivating || !reactivateDate || !reactivateSlot}
                style={[
                  styles.modalBtn,
                  { flex: 1, backgroundColor: "#16a34a" },
                  (isReactivating || !reactivateDate || !reactivateSlot) && { opacity: 0.6 },
                ]}
              >
                {isReactivating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>Reactivate</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  </View>
</Modal>


{/* Edit Modal - CONTINUES FROM PART 1 */}
<Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
  <View style={styles.overlay}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
      <View style={[styles.modalCard, { maxHeight: '90%' }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Appointment</Text>
          <TouchableOpacity onPress={closeEdit}>
            <Text style={{ fontSize: 20, color: COLORS.dim, fontWeight: "800" }}>✕</Text>
          </TouchableOpacity>
        </View>

        {selectedEdit && (
          <ScrollView nestedScrollEnabled>
            <Text style={{ color: COLORS.dim, marginBottom: 12, fontWeight: "600" }}>
              {selectedEdit.serviceCode} - {SERVICE_NAMES[selectedEdit.serviceCode]}
            </Text>

            {/* Calendar */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={() => setEditCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthTitle(editCalendarDate)}</Text>
              <TouchableOpacity
                onPress={() => setEditCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>▶</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calGrid}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <Text key={i} style={styles.calHeader}>{d}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {getCalendarDays(editCalendarDate).map((d, idx) => {
                if (d.getTime() === 0) return <View key={idx} style={styles.calCell} />;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                d.setHours(0, 0, 0, 0);
                
                const isAvailable = isDateAvailable(d, selectedEdit.serviceCode) && d >= today;
                const isSelected = editDate && sameDay(d, editDate);
                
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => isAvailable && setEditDate(d)}
                    disabled={!isAvailable}
                    style={[
                      styles.calCell,
                      !isAvailable && { opacity: 0.3 },
                      isSelected && styles.calCellSelected
                    ]}
                  >
                    <Text style={[styles.calDay, isSelected && { color: "white", fontWeight: "800" }]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time Slots */}
            {editDate && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Available Time Slots</Text>
                {editAvailableSlots.length > 0 ? (
                  <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                    {editAvailableSlots.map((slot, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setEditTimeSlot(slot);
                          setShowEditCustomTime(false);
                        }}
                        style={[
                          styles.timeOption,
                          editTimeSlot?.startTime === slot.startTime && 
                          editTimeSlot?.endTime === slot.endTime && 
                          styles.timeOptionActive
                        ]}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          editTimeSlot?.startTime === slot.startTime && 
                          editTimeSlot?.endTime === slot.endTime && 
                          styles.timeOptionTextActive
                        ]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={{ color: COLORS.dim, marginTop: 8 }}>No available slots</Text>
                )}

                {/* Custom Time Option */}
                <TouchableOpacity
                  onPress={() => setShowEditCustomTime(!showEditCustomTime)}
                  style={[styles.customTimeBtn, { marginTop: 12 }]}
                >
                  <Text style={styles.customTimeBtnText}>
                    {showEditCustomTime ? "Use Suggested Slots" : "Enter Custom Time"}
                  </Text>
                </TouchableOpacity>

                {showEditCustomTime && (
                  <View style={styles.customTimeContainer}>
                    <Text style={styles.customTimeTitle}>Custom Time Slot</Text>

                    <View style={styles.availableTimeContainer}>
                      <Text style={styles.availableTimeLabel}>Available Time Today:</Text>
                      {findAvailableTimeRanges(editDate).map((range, idx) => (
                        <Text key={idx} style={styles.availableTimeText}>{range}</Text>
                      ))}
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <View style={styles.pickerContainer}>
                        <ScrollView style={styles.timePicker} nestedScrollEnabled>
                          {filterTimeOptionsByAvailableRanges(
                            findAvailableTimeRanges(editDate),
                            selectedEdit.serviceCode
                          ).length === 0 ? (
                            <View style={{ padding: 12 }}>
                              <Text style={{ color: COLORS.dim, textAlign: "center" }}>
                                No available time slots
                              </Text>
                            </View>
                          ) : (
                            filterTimeOptionsByAvailableRanges(
                              findAvailableTimeRanges(editDate),
                              selectedEdit.serviceCode
                            ).map(time => (
                              <TouchableOpacity
                                key={time}
                                onPress={() => {
                                  setEditCustomStart(time);
                                  const duration = getServiceDuration(selectedEdit.serviceCode);
                                  const end = calculateEndTime(time, duration);
                                  setEditCustomEnd(end);
                                }}
                                style={[
                                  styles.timeOption,
                                  editCustomStart === time && styles.timeOptionActive
                                ]}
                              >
                                <Text style={[
                                  styles.timeOptionText,
                                  editCustomStart === time && styles.timeOptionTextActive
                                ]}>
                                  {time}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.inputLabel}>End Time (Auto-calculated)</Text>
                      <View style={styles.disabledInput}>
                        <Text style={{ color: COLORS.dim }}>
                          {editCustomEnd || "Will be calculated automatically"}
                        </Text>
                      </View>
                    </View>

                    {editCustomStart && editCustomEnd && (
                      <Text style={{ fontSize: 12, color: COLORS.dim, marginTop: 8 }}>
                        Duration: {getServiceDuration(selectedEdit.serviceCode)} minutes
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={submitEdit}
                disabled={isUpdating}
                style={[styles.modalBtn, { flex: 1 }, isUpdating && { opacity: 0.6 }]}
              >
                <Text style={styles.modalBtnText}>{isUpdating ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeEdit} style={[styles.modalBtnSecondary, { flex: 1 }]}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  </View>
</Modal>

{/* Create Modal */}
<Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={closeCreateModal}>
  <View style={styles.overlay}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
      <View style={[styles.modalCard, { maxHeight: '90%' }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Appointment</Text>
          <TouchableOpacity onPress={closeCreateModal}>
            <Text style={{ fontSize: 20, color: COLORS.dim, fontWeight: "800" }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView nestedScrollEnabled>
          {/* Service selection */}
          <Text style={styles.inputLabel}>Select Service</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {availableServiceCodes.map(code => (
              <TouchableOpacity
                key={code}
                onPress={() => {
                  setCreateServiceCode(code);
                  setCreateDate(null);
                  setCreateTimeSlot(null);
                }}
                style={[styles.serviceBtn, createServiceCode === code && styles.serviceBtnActive]}
              >
                <Text style={[styles.serviceBtnText, createServiceCode === code && styles.serviceBtnTextActive]}>
                  {code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {createServiceCode && (
            <>
              {/* Calendar */}
              <View style={styles.monthNav}>
                <TouchableOpacity
                  onPress={() => setCreateCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthTitle(createCalendarDate)}</Text>
                <TouchableOpacity
                  onPress={() => setCreateCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calGrid}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} style={styles.calHeader}>{d}</Text>
                ))}
              </View>
              <View style={styles.calGrid}>
                {getCalendarDays(createCalendarDate).map((d, idx) => {
                  if (d.getTime() === 0) return <View key={idx} style={styles.calCell} />;
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  d.setHours(0, 0, 0, 0);
                  
                  const isAvailable = isDateAvailable(d, createServiceCode) && d >= today;
                  const isSelected = createDate && sameDay(d, createDate);
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => isAvailable && setCreateDate(d)}
                      disabled={!isAvailable}
                      style={[
                        styles.calCell,
                        !isAvailable && { opacity: 0.3 },
                        isSelected && styles.calCellSelected
                      ]}
                    >
                      <Text style={[styles.calDay, isSelected && { color: "white", fontWeight: "800" }]}>
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Slots */}
              {createDate && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.inputLabel}>Available Time Slots</Text>
                  {createAvailableSlots.length > 0 ? (
                    <ScrollView style={styles.timeScroll} nestedScrollEnabled>
                      {createAvailableSlots.map((slot, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => {
                            setCreateTimeSlot(slot);
                            setShowCreateCustomTime(false);
                          }}
                          style={[
                            styles.timeOption,
                            createTimeSlot?.startTime === slot.startTime && 
                            createTimeSlot?.endTime === slot.endTime && 
                            styles.timeOptionActive
                          ]}
                        >
                          <Text style={[
                            styles.timeOptionText,
                            createTimeSlot?.startTime === slot.startTime && 
                            createTimeSlot?.endTime === slot.endTime && 
                            styles.timeOptionTextActive
                          ]}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={{ color: COLORS.dim, marginTop: 8 }}>No available slots</Text>
                  )}

                  {/* Custom Time Option */}
                  <TouchableOpacity
                    onPress={() => setShowCreateCustomTime(!showCreateCustomTime)}
                    style={[styles.customTimeBtn, { marginTop: 12 }]}
                  >
                    <Text style={styles.customTimeBtnText}>
                      {showCreateCustomTime ? "Use Suggested Slots" : "Enter Custom Time"}
                    </Text>
                  </TouchableOpacity>

                  {showCreateCustomTime && (
                    <View style={styles.customTimeContainer}>
                      <Text style={styles.customTimeTitle}>Custom Time Slot</Text>

                      <View style={styles.availableTimeContainer}>
                        <Text style={styles.availableTimeLabel}>Available Time Today:</Text>
                        {findAvailableTimeRanges(createDate).map((range, idx) => (
                          <Text key={idx} style={styles.availableTimeText}>{range}</Text>
                        ))}
                      </View>

                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.inputLabel}>Start Time</Text>
                        <View style={styles.pickerContainer}>
                          <ScrollView style={styles.timePicker} nestedScrollEnabled>
                            {filterTimeOptionsByAvailableRanges(
                              findAvailableTimeRanges(createDate),
                              createServiceCode
                            ).length === 0 ? (
                              <View style={{ padding: 12 }}>
                                <Text style={{ color: COLORS.dim, textAlign: "center" }}>
                                  No available time slots
                                </Text>
                              </View>
                            ) : (
                              filterTimeOptionsByAvailableRanges(
                                findAvailableTimeRanges(createDate),
                                createServiceCode
                              ).map(time => (
                                <TouchableOpacity
                                  key={time}
                                  onPress={() => {
                                    setCreateCustomStart(time);
                                    const duration = getServiceDuration(createServiceCode);
                                    const end = calculateEndTime(time, duration);
                                    setCreateCustomEnd(end);
                                  }}
                                  style={[
                                    styles.timeOption,
                                    createCustomStart === time && styles.timeOptionActive
                                  ]}
                                >
                                  <Text style={[
                                    styles.timeOptionText,
                                    createCustomStart === time && styles.timeOptionTextActive
                                  ]}>
                                    {time}
                                  </Text>
                                </TouchableOpacity>
                              ))
                            )}
                          </ScrollView>
                        </View>
                      </View>

                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.inputLabel}>End Time (Auto-calculated)</Text>
                        <View style={styles.disabledInput}>
                          <Text style={{ color: COLORS.dim }}>
                            {createCustomEnd || "Will be calculated automatically"}
                          </Text>
                        </View>
                      </View>

                      {createCustomStart && createCustomEnd && (
                        <Text style={{ fontSize: 12, color: COLORS.dim, marginTop: 8 }}>
                          Duration: {getServiceDuration(createServiceCode)} minutes
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
                <TouchableOpacity
                  onPress={submitCreate}
                  disabled={isCreating}
                  style={[styles.modalBtn, { flex: 1 }, isCreating && { opacity: 0.6 }]}
                >
                  <Text style={styles.modalBtnText}>{isCreating ? "Creating..." : "Create"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeCreateModal} style={[styles.modalBtnSecondary, { flex: 1 }]}>
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  </View>
</Modal>
    </View>
  );
}

// Helper Components
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      <Text style={{ width: 100, color: COLORS.dim, fontWeight: "700" }}>{label}:</Text>
      <Text style={{ flex: 1, color: COLORS.text }}>{value}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: COLORS.accent, fontSize: 14, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.dim, marginTop: 4, marginBottom: 12 },
  createBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  createBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.card },
  tabs: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    flexDirection: "row",
    padding: 4,
    alignSelf: "flex-start",
  },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  tabActive: { backgroundColor: COLORS.card },
  tabText: { color: COLORS.dim, fontWeight: "700" },
  tabTextActive: { color: COLORS.text },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  navBtnText: { color: COLORS.text, fontWeight: "700" },
  monthText: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  aptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  aptTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  aptSub: { fontSize: 12, color: COLORS.dim, marginTop: 2 },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  calHeader: {
    width: "13%",
    textAlign: "center",
    fontWeight: "700",
    color: COLORS.dim,
    fontSize: 12,
    paddingVertical: 6,
  },
  calCell: {
    width: "13%",
    aspectRatio: 1,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 4,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  calCellSelected: {
    backgroundColor: COLORS.accent,
  },
  calDay: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  calApt: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  calAptText: { fontSize: 8, color: "white", fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnText: { color: "white", fontWeight: "700" },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnSecondaryText: { color: COLORS.accent, fontWeight: "700" },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 6,
  },
  timeScroll: {
    maxHeight: 150,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  timeOptionActive: { backgroundColor: COLORS.accent },
  timeOptionText: { fontSize: 14, color: COLORS.text },
  timeOptionTextActive: { color: "white", fontWeight: "700" },
  serviceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg,
  },
  serviceBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  serviceBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  serviceBtnTextActive: { color: "white" },
  customTimeBtn: {
    backgroundColor: COLORS.bg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  customTimeBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    textAlign: "center",
  },
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
  disabledInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.dim,
  },
  filterBtnTextActive: {
    color: "white",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "white",
    fontWeight: "700",
  },
  cancelAppointmentInfo: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  cancelAppointmentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  cancelAppointmentDetails: {
    fontSize: 14,
    color: COLORS.dim,
    marginBottom: 6,
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    textAlign: "center",
  },
});