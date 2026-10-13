import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

// Pages for logged-out visitors (login, register). Logged-in merchants go straight to /home.
export const Route = createFileRoute("/_guest")({
  component: GuestLayout,
});

function GuestLayout() {
  const { status } = useAuth();
  if (status === "authenticated") return <Navigate to="/home" replace />;
  return <Outlet />;
}
