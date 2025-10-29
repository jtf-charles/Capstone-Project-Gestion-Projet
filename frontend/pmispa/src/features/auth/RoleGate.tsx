import type { PropsWithChildren } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "./types";

export function RoleGate({ role, children }: PropsWithChildren<{ role: Role }>) {
  const { user } = useAuth();
  if (!user) return null;

  // Normalisation de type locale pour l'égalité stricte
  const userRole = (user.role as unknown) as Role;

  return userRole === role ? <>{children}</> : null;
}
