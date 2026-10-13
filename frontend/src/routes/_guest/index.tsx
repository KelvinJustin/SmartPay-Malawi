import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field, FormMessage } from "@/components/AuthLayout";
import { ApiError, NetworkError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// The login page is the main page of the app.
export const Route = createFileRoute("/_guest/")({
  validateSearch: (search: Record<string, unknown>): { registered?: true } =>
    search.registered === true || search.registered === "true" ? { registered: true } : {},
  head: () => ({ meta: [{ title: "Log in — SmartPay Malawi" }] }),
  component: Login,
});

function loginErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Can't reach the server. Check your connection and try again.";
  if (err instanceof ApiError) {
    if (err.status === 401) return "Incorrect email or password.";
    if (err.status === 400) return err.message;
  }
  return "Something went wrong on our side. Please try again.";
}

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { registered } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      await login(String(form.get("email")).trim(), String(form.get("password")));
      await navigate({ to: "/home", replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome" subtitle="Enter your email and password to log in.">
      <form className="space-y-4" onSubmit={onSubmit}>
        {registered && !error ? <FormMessage kind="success">Account created. Log in to continue.</FormMessage> : null}
        {error ? <FormMessage kind="error">{error}</FormMessage> : null}
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
        <button type="submit" className="btn-primary mt-2 disabled:opacity-60" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-semibold text-foreground underline underline-offset-4">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}
