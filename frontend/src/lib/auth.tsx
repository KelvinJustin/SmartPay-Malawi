import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";

export type Merchant = { userId: string; email: string };

export type RegisterInput = { name: string; email: string; password: string; phone: string };

type Status =
  | "loading" // checking the session with GET /auth/me
  | "authenticated"
  | "unauthenticated" // server said 401
  | "error"; // network/server failure: we do NOT know whether the session is valid

type AuthContextValue = {
  status: Status;
  merchant: Merchant | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  // Restore the session. 401 = logged out; anything else = unknown (don't assume expired).
  const restore = useCallback(async () => {
    setStatus("loading");
    try {
      setMerchant(await api<Merchant>("/auth/me"));
      setStatus("authenticated");
    } catch (err) {
      setMerchant(null);
      setStatus(err instanceof ApiError && err.status === 401 ? "unauthenticated" : "error");
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    await api("/auth/login", { method: "POST", body: { email, password } });
    // The login response has no identity, so ask the server who we are.
    setMerchant(await api<Merchant>("/auth/me"));
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    // Registration does not create a session; the caller sends the merchant to log in.
    await api("/auth/register", { method: "POST", body: input });
  }, []);

  const logout = useCallback(async () => {
    // Only reset local state once the server confirms: the backend is what clears the cookie,
    // so a failed request means the session may still be valid. Errors propagate to the caller.
    await api("/auth/logout", { method: "POST" });
    setMerchant(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, merchant, login, register, logout, retry: () => void restore() }),
    [status, merchant, login, register, logout, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
