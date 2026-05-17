import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({ component: Callback });

function Callback() {
  const navigate = useNavigate();
  const refreshProfile = useAuth((s) => s.refreshProfile);
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await refreshProfile();
        const p = useAuth.getState().profile;
        navigate({ to: p?.onboarded ? "/dashboard" : "/onboarding", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Signing you in…
      </div>
    </div>
  );
}
