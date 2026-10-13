import type { InputHTMLAttributes, ReactNode } from "react";
import logo from "@/assets/logo.png";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <img src={logo} alt="SmartPay" className="mx-auto mb-8 h-24 w-auto" />
        <div className="rounded-3xl bg-card p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input className="field" {...props} />
    </label>
  );
}

/** Inline message under a form: role=alert for errors, role=status for success notes. */
export function FormMessage({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-foreground";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}
