import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Bell, Search, Menu as MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, DbProfile } from "@/lib/api";
import { TopMenu } from "@/components/TopMenu";

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<DbProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

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

  const initial = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className="h-14 flex items-center justify-between px-4 sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
        <NavLink to="/library" className="text-[17px] font-semibold tracking-tight text-foreground spring-tap">
          Tempo
        </NavLink>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/profile")}
            aria-label="Profile"
            className="h-9 w-9 grid place-items-center rounded-full overflow-hidden spring-tap bg-muted"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[13px] font-semibold text-foreground">{initial}</span>
            )}
          </button>

          <NavLink
            to="/inbox"
            aria-label="Notifications"
            className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-muted spring-tap"
          >
            <Bell className="h-[19px] w-[19px] text-foreground" strokeWidth={1.8} />
            {pending > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-background" />
            )}
          </NavLink>

          <button
            onClick={() => navigate("/discover")}
            aria-label="Search"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted spring-tap"
          >
            <Search className="h-[19px] w-[19px] text-foreground" strokeWidth={1.8} />
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted spring-tap"
          >
            <MenuIcon className="h-[20px] w-[20px] text-foreground" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0 animate-fade-in">
        <Outlet />
      </main>

      <TopMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
