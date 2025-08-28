const BASE = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

export function api(path: string, init?: RequestInit) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}
