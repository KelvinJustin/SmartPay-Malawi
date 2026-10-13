import { HeadContent, Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { FullScreenMessage } from "@/components/FullScreenMessage";

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
});

function Root() {
  return (
    <AuthProvider>
      <HeadContent />
      <SessionGate />
    </AuthProvider>
  );
}

// Nothing renders until GET /auth/me has answered, so there is no flash of the wrong screen.
function SessionGate() {
  const { status, retry } = useAuth();

  if (status === "loading") return <FullScreenMessage title="Loading…" />;

  // A network/server failure is not proof the session expired, so don't show the login form as if it were.
  if (status === "error") {
    return (
      <FullScreenMessage title="Can't reach SmartPay">
        <p>Check your connection and that the server is running, then try again.</p>
        <button type="button" onClick={retry} className="btn-secondary mt-6">
          Try again
        </button>
      </FullScreenMessage>
    );
  }

  return <Outlet />;
}

function NotFound() {
  return (
    <FullScreenMessage title="Page not found">
      <Link to="/" className="font-semibold text-foreground underline underline-offset-4">
        Go home
      </Link>
    </FullScreenMessage>
  );
}
