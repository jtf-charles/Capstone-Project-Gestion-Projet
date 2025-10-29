// src/lib/api.ts
type ApiOptions = {
  method?: string;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
};

export async function apiFetch<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token, headers = {} } = opts;

  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) h.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    // essaie de lire un message d’erreur JSON, sinon message générique
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) message = Array.isArray(data.detail) ? data.detail.join(", ") : data.detail;
      if (data?.message) message = data.message;
    } catch (_) {}
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}
