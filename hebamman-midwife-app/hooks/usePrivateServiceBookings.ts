// hooks/usePrivateServiceBookings.ts
import { api } from "@/lib/api";
import { compareAsc, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CourseSession = {
  sessionNumber: number;
  date: string; // DD/MM/YYYY
  day: string;
  startTime: string;
  endTime: string;
};

export type PrivateServiceBooking = {
  _id: string;
  userId: string;
  midwifeId: string;
  serviceId: string;
  serviceName: string;
  serviceType: "In persona" | "Videocall";
  serviceMode: "Individual" | "Group";
  duration: number;
  price: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bookingType: "single" | "course";
  selectedSlot: string; // "HH:MM-HH:MM"
  selectedDate: string; // DD/MM/YYYY
  selectedDay: string;
  courseSessions?: CourseSession[];
  status: "active" | "completed" | "cancelled" | "pending";
  createdAt: string;
  updatedAt: string;
};

type PrivateServiceBookingsResponse =
  | { success: true; data: PrivateServiceBooking[] }
  | { success: false; message: string };

function parseDMY(d: string | undefined) {
  if (!d) return null;
  try {
    return parse(d, "dd/MM/yyyy", new Date());
  } catch {
    return null;
  }
}

function getBookingDate(booking: PrivateServiceBooking): Date | null {
  if (booking.bookingType === "course" && booking.courseSessions?.length) {
    return parseDMY(booking.courseSessions[0].date);
  }
  return parseDMY(booking.selectedDate);
}

export function usePrivateServiceBookings(midwifeId?: string) {
  const [bookings, setBookings] = useState<PrivateServiceBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = midwifeId?.trim() || "";

  const fetchBookings = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/api/public/privateServiceBooking/${resolvedId}`);
      const json = (await res.json()) as PrivateServiceBookingsResponse;
      if (!res.ok || !json.success) {
        throw new Error(
          ("message" in json && json.message) || "Failed to load private service bookings"
        );
      }
      setBookings(json.data || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load private service bookings");
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (resolvedId) {
      fetchBookings();
    }
  }, [fetchBookings, resolvedId]);

  const today = startOfDay(new Date());

  const upcoming = useMemo(() => {
    return bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({ b, d: getBookingDate(b) }))
      .filter((x) => x.d && (isAfter(x.d, today) || +x.d === +today))
      .sort((a, b) => compareAsc(a.d!, b.d!))
      .map((x) => x.b);
  }, [bookings, today]);

  const past = useMemo(() => {
    return bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({ b, d: getBookingDate(b) }))
      .filter((x) => x.d && isBefore(x.d, today))
      .sort((a, b) => compareAsc(b.d!, a.d!)) // newest first for past
      .map((x) => x.b);
  }, [bookings, today]);

  const cancelled = useMemo(() => {
    return bookings.filter((b) => b.status === "cancelled");
  }, [bookings]);

  const refresh = useCallback(() => {
    if (resolvedId) return fetchBookings();
  }, [fetchBookings, resolvedId]);

  return { bookings, upcoming, past, cancelled, loading, error, refresh };
}

export function privateServiceDisplayDate(booking: PrivateServiceBooking) {
  const dateStr =
    booking.bookingType === "course" && booking.courseSessions?.length
      ? booking.courseSessions[0].date
      : booking.selectedDate;
  const d = parseDMY(dateStr);
  return d
    ? d.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : dateStr || "—";
}

export function privateServiceTimeRange(booking: PrivateServiceBooking) {
  if (booking.bookingType === "course" && booking.courseSessions?.length) {
    const first = booking.courseSessions[0];
    return { start: first.startTime || "", end: first.endTime || "" };
  }
  const [start, end] = (booking.selectedSlot || "").split("-");
  return { start: start || "", end: end || "" };
}

export function privateServiceFullName(booking: PrivateServiceBooking) {
  return `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "—";
}
