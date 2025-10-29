export type Role = "admin" | "regular";

export async function loginApi(
  _baseUrl: string,
  params: { username: string; password: string; expectRole: Role }
) {
  const { username, password, expectRole } = params;
  const BASE = import.meta.env.VITE_API_URL;
  const res = await fetch(`${BASE}/auth/login`, {            // ⬅️ note: pas de baseUrl
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      username,
      password,
      expect_role: expectRole,                               // snake_case attendu par FastAPI
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any));
    throw new Error(
      typeof data?.detail === "string" ? data.detail : data?.detail ? JSON.stringify(data.detail) : "Login failed"
    );
  }
  return (await res.json()) as {
    access_token: string;
    token_type: "bearer";
    username: string;
    role: Role;
  };
}
