import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { AppLayout } from "@/components/layout/AppLayout";
import { Clock, Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: Gate });

function Gate() {
  const { session, profile, membership, org, loading, signOut } = useAuth();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, loading, pathname]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (pathname === "/onboarding") return <Outlet />;

  // Show pending approval screen if user has joined an org but is still pending
  if (membership?.status === "pending" && pathname !== "/onboarding") {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-4">
        <div className="card-surface w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold">Awaiting approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your request to join <span className="font-medium text-foreground">{org?.name ?? "the workspace"}</span> is
            pending review by an admin.
          </p>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You'll be notified once approved. Check back later or ask your admin to approve your request.
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Org ID: <span className="font-mono font-semibold text-primary-700">{org?.code}</span>
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout><Outlet /></AppLayout>;
}
