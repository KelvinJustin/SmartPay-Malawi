import type { ReactNode } from "react";

/** Centered status screen used while checking the session or when the server is unreachable. */
export function FullScreenMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {children ? <div className="mt-2 text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </main>
  );
}
