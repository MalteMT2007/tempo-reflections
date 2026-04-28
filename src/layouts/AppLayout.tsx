import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, DbProfile } from "@/lib/api";
import { BottomDock } from "@/components/BottomDock";
import { ReaderHamburger } from "@/components/ReaderHamburger";

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);

  useEffect(() => {
    const sync = () => setReaderOpen(document.body.hasAttribute("data-reader-open"));
    sync();
    window.addEventListener("reader-open-change", sync);
    return () => window.removeEventListener("reader-open-change", sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

  const initial = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Floating profile top-right */}
      {!readerOpen && (
        <button
          onClick={() => navigate("/profile")}
          aria-label="Profile"
          className="fixed z-40 h-10 w-10 grid place-items-center rounded-full overflow-hidden spring-tap bg-muted/80 backdrop-blur-xl border border-border/60 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            right: "calc(env(safe-area-inset-right, 0px) + 14px)",
          }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[13px] font-semibold text-foreground">{initial}</span>
          )}
        </button>
      )}

      <main className="flex-1 min-w-0 animate-fade-in pb-28">
        <Outlet />
      </main>

      {readerOpen ? <ReaderHamburger /> : <BottomDock />}
    </div>
  );
}
