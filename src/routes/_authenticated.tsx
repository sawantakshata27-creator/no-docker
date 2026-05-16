import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: Gate });

function Gate() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile && !profile.onboarded && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [session, profile, loading, pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  // Onboarding renders full-screen (no app shell)
  if (pathname === "/onboarding") return <Outlet />;

  return <AppLayout><Outlet /></AppLayout>;
}
