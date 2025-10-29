// src/features/auth/RequireGuest.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireGuest() {
  const { token } = useAuth();
  const location = useLocation();

  if (token) {
    // s’il vient de /login, on peut choisir une destination par défaut
    const fallback = "/";
    const from = (location.state as any)?.from?.pathname || fallback;
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
