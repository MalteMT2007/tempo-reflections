import { Outlet, NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function AppLayout() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [{ count: ec }, { count: rc }] = await Promise.all([
          supabase.from("ensemble_invites").select("id", { head: true, count: "exact" }).eq("status", "pending"),
          supabase.from("room_invites").select("id", { head: true, count: "exact" }).eq("status", "pending").eq("invitee_id", user.id),
        ]);
        if (!cancelled) setPending((ec ?? 0) + (rc ?? 0));
      } catch {}
    };
    load();
    const ch = supabase
      .channel("inbox-badge-header")
      .on("postgres_changes", { event: "*", schema: "public", table: "ensemble_invites" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-30 glass-strong border-b-0">
            <SidebarTrigger className="text-foreground/70 hover:text-foreground spring-tap" />
            <NavLink
              to="/inbox"
              aria-label="Inbox"
              className="relative h-10 w-10 grid place-items-center rounded-full glass spring-tap"
            >
              <Bell className="h-[18px] w-[18px]" />
              {pending > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_2px_hsl(250_30%_6%)]" />
              )}
            </NavLink>
          </header>
          <main className="flex-1 min-w-0 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
