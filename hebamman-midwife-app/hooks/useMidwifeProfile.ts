// hooks/useMidwifeProfile.ts
import { useCallback, useEffect, useState } from "react";

export type CloudMedia = {
  url?: string;
  public_id?: string;
  name?: string;
};

export type MidwifeProfile = {
  _id: string;
  userId: string;
  personalInfo?: {
    profileImage?: CloudMedia;
    logo?: CloudMedia;
    googleAddress?: {
      fullAddress?: string;
      mainText?: string;
      secondaryText?: string;
      placeId?: string;
      types?: string[];
    };
    firstName?: string;
    lastName?: string;
    midwifeTitle?: string;
    username?: string;
    slogan?: string;
    personalStatement?: string;
    about?: string;
    email?: string;
    phone?: string;
    address?: string;
    serviceRadius?: string;
  };
  midwifeType?: {
    midwifeType?: string;
    services?: {
      ["private-services"]?: any[];
      ["courses-classes"]?: any[];
    };
  };
  identity?: {
    intensity?: string;
    totalWeeklyHours?: number;
    monthlyTurnover?: number;
    timetable?: {
      [weekday: string]: {
        slots: {
          [serviceCode: string]: { startTime: string; endTime: string }[];
        };
      };
    };
  };
  bankInfo?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  moreInfo?: {
    acupuncture?: string;
    professionalExperience?: string;
    message?: string;
    supportedPregnancies?: number;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    [k: string]: string | undefined;
  };
  services?: {
    [code: string]: {
      code?: string;
      title?: string;
      description?: string;
      serviceType?: string;
      duration?: string;
      startingAt?: string;
      interval?: string | null;
      appointments?: string | null;
      turnover?: string | null;
    };
  };
  testimonials?: {
    profileImage?: CloudMedia;
    name?: string;
    designation?: string;
    description?: string;
    _id?: string;
  }[];
  faqs?: { question?: string; answer?: string; _id?: string }[];
  isProfileComplete?: boolean;
  midwifeStatus?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ApiOk = { success: true; message: string; data: MidwifeProfile };
type ApiErr = { success: false; message: string };
type ApiRes = ApiOk | ApiErr;

export function useMidwifeProfile(userId?: string | null) {
  const [data, setData] = useState<MidwifeProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

  const load = useCallback(async () => {
    if (!API_BASE || !userId) return;
    setStatus("loading");
    setError(null);
    try {
      const url = `${API_BASE}/api/midwives/userId?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      const json: ApiRes = await res.json();
      if (!res.ok || !("success" in json && json.success)) {
        throw new Error(("message" in json && json.message) || `HTTP ${res.status}`);
      }
      setData(json.data);
      setStatus("success");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load profile");
      setStatus("error");
    }
  }, [API_BASE, userId]);

  useEffect(() => {
    if (userId) {
      void load();
    }
  }, [userId, load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return { data, status, error, refresh };
}
