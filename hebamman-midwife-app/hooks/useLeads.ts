// hooks/useLeads.ts
import { api } from "@/lib/api";
import { compareAsc, isAfter, isBefore, parse, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

export type Lead = {
  _id: string;
  userId: string;
  midwifeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  insuranceNumber?: string;
  insuranceCompany?: string;
  insuranceType?: "government" | "private" | string;
  date: string; // "dd/MM/yyyy"
  expectedDeliveryDate?: string; // "dd/MM/yyyy"
  selectedAddressDetails?: {
    address?: string;
    details?: { formattedAddress?: string };
  } & Record<string, any>;
  selectedSlot?: string; // "13:50-14:40"
  status?: "pending" | "completed" | string;
  createdAt?: string; // ISO
};

type LeadsResponse =
  | { success: true; data: Lead[] }
  | { success: true; message: string; data: Lead[] }
  | { success: false; message: string };

function parseDMY(d: string | undefined) {
  if (!d) return null;
  try {
    // API uses dd/MM/yyyy
    return parse(d, "dd/MM/yyyy", new Date());
  } catch {
    return null;
  }
}

export function useLeads(midwifeId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = midwifeId?.trim() || "";

  const fetchLeads = useCallback(async () => {
    if (!resolvedId) return; // wait until we actually have an id
    setLoading(true);
    setError(null);
    try {
      // Path style, as per your working URL:
      const res = await api(`/api/public/midwifeBooking/${resolvedId}`);
      const json = (await res.json()) as LeadsResponse;
      if (!res.ok || !("success" in json) || !json.success) {
        throw new Error(("message" in json && json.message) || "Failed to load leads");
      }
      setLeads(json.data || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (resolvedId) {
      fetchLeads();
    }
  }, [fetchLeads, resolvedId]);

  const today = startOfDay(new Date());

  const upcoming = useMemo(() => {
    const withDates = leads
      .map((l) => ({ l, d: parseDMY(l.date) }))
      .filter((x) => x.d);
    return withDates
      .filter(({ d }) => d && (isAfter(d, today) || +d === +today))
      .sort((a, b) => compareAsc(a.d!, b.d!))
      .map((x) => x.l);
  }, [leads, today]);

  const past = useMemo(() => {
    const withDates = leads
      .map((l) => ({ l, d: parseDMY(l.date) }))
      .filter((x) => x.d);
    return withDates
      .filter(({ d }) => d && isBefore(d, today))
      .sort((a, b) => compareAsc(a.d!, b.d!))
      .map((x) => x.l);
  }, [leads, today]);

  const refresh = useCallback(() => {
    if (resolvedId) return fetchLeads();
  }, [fetchLeads, resolvedId]);

  return { leads, upcoming, past, loading, error, refresh };
}

export function leadDisplayDate(lead: Lead) {
  const d = parseDMY(lead.date);
  return d
    ? d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : lead.date;
}

export function leadAddress(lead: Lead) {
  return (
    lead?.selectedAddressDetails?.details?.formattedAddress ||
    lead?.selectedAddressDetails?.address ||
    "—"
  );
}
