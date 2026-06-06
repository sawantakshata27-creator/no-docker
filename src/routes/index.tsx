import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Root "/" no longer renders a marketing landing page (see issue #12).
 * It is now a thin redirect:
 *   - Authenticated users  → /dashboard
 *   - Everyone else        → /login
 *
 * We resolve the session in `beforeLoad` so the user never sees a flash of
 * unstyled content or a loading spinner before the redirect happens.
 */
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard", replace: true });
    }
    throw redirect({ to: "/login", replace: true });
  },
});
