import { PropsWithChildren } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "./types";

export function RoleGate({ role, children }: PropsWithChildren<{ role: Role }>) {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === role ? <>{children}</> : null;
}
