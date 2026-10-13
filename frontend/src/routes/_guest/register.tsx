import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout, Field, FormMessage } from "@/components/AuthLayout";
import { ApiError, NetworkError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_guest/register")({
  head: () => ({ meta: [{ title: "Register — SmartPay Malawi" }] }),
  component: Register,
});

function registerErrorMessage(err: unknown): string {
  if (err instanceof NetworkError) return "Can't reach the server. Check your connection and try again.";
  if (err instanceof ApiError) {
    if (err.status === 409) return "That email is already registered. Try logging in instead.";
    if (err.status === 400) return err.message;
  }
  return "Something went wrong on our side. Please try again.";
}

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
        // Backend validates a Malawi number; spaces from "+265 99 123 4567" are just noise.
        phone: String(form.get("phone")).replace(/[\s-]/g, ""),
      });
      // Registration doesn't start a session, so send the merchant to log in.
      await navigate({ to: "/", search: { registered: true } });
    } catch (err) {
      setError(registerErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Enter your details to register.">
      <form className="space-y-4" onSubmit={onSubmit}>
        {error ? <FormMessage kind="error">{error}</FormMessage> : null}
        <Field label="Business name" name="name" autoComplete="organization" placeholder="Chikondi Traders" minLength={2} maxLength={100} required />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <Field label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+265 99 123 4567" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 6 characters" minLength={6} maxLength={100} required />
        <button type="submit" className="btn-primary mt-2 disabled:opacity-60" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link to="/" className="font-semibold text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
