import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authed/home")({
  head: () => ({ meta: [{ title: "Home — SmartPay Malawi" }] }),
  component: Home,
});

function Home() {
  const { merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setError(null);
    setLoggingOut(true);
    try {
      await logout();
      await navigate({ to: "/", replace: true });
    } catch {
      setError("Couldn't log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <img src={logo} alt="SmartPay" className="h-10 w-auto" />
        <button type="button" onClick={onLogout} disabled={loggingOut} className="btn-secondary disabled:opacity-60">
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-5 pt-10">
        {error ? (
          <p role="alert" className="mb-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <p className="text-sm font-medium text-muted-foreground">Good to see you</p>
        <h1 className="mt-1 break-words text-4xl font-extrabold tracking-tight sm:text-5xl">Welcome back!</h1>
        <p className="mt-2 text-muted-foreground">{merchant?.email}</p>
        <div className="mt-10 rounded-3xl bg-card p-8 shadow-soft">
          <p className="text-sm text-muted-foreground">Your space is ready. More is coming soon.</p>
        </div>
      </main>
    </div>
  );
}
