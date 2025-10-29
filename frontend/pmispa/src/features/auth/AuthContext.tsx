// src/features/auth/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";
import { loginApi } from "./api";

type Role = "admin" | "regular";

type SessionUser = { username: string; role: Role };
type AuthContextType = {
  user: SessionUser | null;
  token: string | null;
  loginAs: (args: { username: string; password: string; expectRole: Role }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_TOKEN = "pmispa.token";
const LS_USER  = "pmispa.user";
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ hydratation synchrone (pas de flash /login)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [user,  setUser]  = useState<SessionUser | null>(() => {
    const u = localStorage.getItem(LS_USER);
    return u ? JSON.parse(u) : null;
  });

  async function loginAs({ username, password, expectRole }: {
    username: string; password: string; expectRole: Role;
  }) {
    const { access_token, username: uname, role } = await loginApi(API_BASE, { username, password, expectRole });
    const u: SessionUser = { username: uname, role };
    setUser(u);
    setToken(access_token);
    localStorage.setItem(LS_TOKEN, access_token);
    localStorage.setItem(LS_USER, JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
  }

  return (
    <AuthContext.Provider value={{ user, token, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
