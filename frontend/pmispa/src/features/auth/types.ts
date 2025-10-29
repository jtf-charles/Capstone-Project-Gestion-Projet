export type Role = "ADMIN" | "GENERAL";
export type User = { id: number; username: string; role: Role };
export type AuthPayload = { access_token: string; token_type: "bearer"; user: User };
