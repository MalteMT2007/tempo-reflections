import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, DbProfile } from "@/lib/api";
import { BottomDock } from "@/components/BottomDock";
import { ReaderHamburger } from "@/components/ReaderHamburger";
import { LiveScoreReaderHost } from "@/components/LiveScoreReaderHost";

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<DbProfile | null>(null);

  // Reader mode = no overlay, ScoreReader chrome interactive.
  const inReader = location.pathname === "/reader";

  // Toggle a body attribute so ScoreReader can know when an overlay
  // is covering it (and hide its own top toolbars accordingly).
  useEffect(() => {
    if (inReader) {
      document.body.removeAttribute("data-page-overlay");
    } else {
      document.body.setAttribute("data-page-overlay", "true");
    }
    return () => document.body.removeAttribute("data-page-overlay");
  }, [inReader]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

  const initial = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen w-full bg-background relative">
      {/* Persistent background reader — single instance, never unmounts */}
      <LiveScoreReaderHost />

      {/* Floating profile (hidden while reading to keep score clean) */}
      {!inReader && (
        <button
          onClick={() => navigate("/profile")}
          aria-label="Profile"
          className="fixed z-[45] h-10 w-10 grid place-items-center rounded-full overflow-hidden spring-tap bg-muted/80 backdrop-blur-xl border border-border/60 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]"
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

      {/* Page overlay layer (route content). Reader page renders nothing. */}
      <Outlet />

      {/* Always-on dock + hamburger */}
      <BottomDock inReader={inReader} />
      <ReaderHamburger />
    </div>
  );
}
