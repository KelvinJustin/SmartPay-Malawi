import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

// Pages that need a session. Anyone else is sent to the login page ("/").
export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const { status } = useAuth();
  if (status !== "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
