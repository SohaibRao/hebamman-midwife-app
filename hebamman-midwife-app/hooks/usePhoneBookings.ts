// hooks/usePhoneBookings.ts
import { api } from "@/lib/api";
import { compareAsc, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

export type PhoneBooking = {
  _id: string;
  userId: string;
  midwifeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  date: string; // DD/MM/YYYY
  selectedSlot: string; // "HH:MM-HH:MM"
  meetingLink: string | null;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
};

type PhoneBookingsResponse =
  | { success: true; data: PhoneBooking[] }
  | { success: false; message: string };

function parseDMY(d: string | undefined) {
  if (!d) return null;
  try {
    return parse(d, "dd/MM/yyyy", new Date());
  } catch {
    return null;
  }
}

export function usePhoneBookings(midwifeId?: string) {
  const [bookings, setBookings] = useState<PhoneBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = midwifeId?.trim() || "";

  const fetchBookings = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/api/public/phoneBooking?midwifeId=${resolvedId}`);
      const json = (await res.json()) as PhoneBookingsResponse;
      if (!res.ok || !json.success) {
        throw new Error(
          ("message" in json && json.message) || "Failed to load phone bookings"
        );
      }
      setBookings(json.data || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load phone bookings");
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
      .map((b) => ({ b, d: parseDMY(b.date) }))
      .filter((x) => x.d && (isAfter(x.d, today) || +x.d === +today))
      .sort((a, b) => compareAsc(a.d!, b.d!))
      .map((x) => x.b);
  }, [bookings, today]);

  const past = useMemo(() => {
    return bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({ b, d: parseDMY(b.date) }))
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

export function phoneBookingDisplayDate(booking: PhoneBooking) {
  const d = parseDMY(booking.date);
  return d
    ? d.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : booking.date;
}

export function phoneBookingTimeRange(booking: PhoneBooking) {
  const [start, end] = booking.selectedSlot.split("-");
  return { start: start || "", end: end || "" };
}
