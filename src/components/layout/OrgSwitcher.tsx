import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

export function OrgSwitcher() {
  const { user, org, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);

  // Fetch all organizations this user is a member of
  const { data: userOrgs } = useQuery({
    queryKey: ["user-orgs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("org_id, role, status, organizations(id, name, code)")
        .eq("user_id", user!.id)
        .eq("status", "active");
      
      return (memberships ?? [])
        .map((m: any) => ({
          id: m.organizations.id,
          name: m.organizations.name,
          code: m.organizations.code,
          role: m.role,
        }))
        .filter((o: any) => o.id && o.name);
    },
  });

  if (!org || !userOrgs || userOrgs.length <= 1) {
    return null; // Don't show switcher if user has 0 or 1 org
  }

  const handleSwitch = async (orgId: string) => {
    try {
      await switchOrg(orgId);
      toast.success("Workspace switched");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to switch workspace");
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen((o) => !o)}
        data-testid="org-switcher-btn"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-muted"
      >
        <Building2 className="h-4 w-4 text-primary-600" />
        <div className="min-w-0 text-left">
          <div className="truncate font-medium">{org.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{org.code}</div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              data-testid="org-switcher-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
              data-testid="org-switcher-dropdown"
            >
              <div className="border-b border-border px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Switch Workspace
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {userOrgs.map((o: any) => {
                  const isActive = o.id === org.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => !isActive && handleSwitch(o.id)}
                      disabled={isActive}
                      data-testid={`org-option-${o.code}`}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        isActive
                          ? "bg-primary-50 text-primary-700 cursor-default"
                          : "hover:bg-muted cursor-pointer"
                      }`}
                    >
                      <Building2 className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-600" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{o.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{o.code}</span>
                          {o.role === "owner" && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700">
                              OWNER
                            </span>
                          )}
                        </div>
                      </div>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
