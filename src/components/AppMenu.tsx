import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, Users, Music2, LogOut, FileMusic, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, DbProfile } from "@/lib/api";

export const AppMenu = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<DbProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed top-5 right-5 z-30 h-10 w-10 rounded-full border border-border bg-card/70 backdrop-blur flex items-center justify-center hover:border-ink/40 transition"
      >
        <Menu className="h-4 w-4 text-ink" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-paper border-l border-border shadow-elev p-6 flex flex-col animate-fade-in"
          >
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Menu</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:border-ink/40 transition"
              >
                <X className="h-4 w-4 text-ink" />
              </button>
            </div>

            {/* Identity */}
            <div className="mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-ink text-paper flex items-center justify-center font-serif text-lg">
                  {(profile?.display_name || profile?.username || user?.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-lg text-ink truncate leading-tight">
                    {profile?.display_name || profile?.username || "You"}
                  </p>
                  <p className="text-xs text-ink-soft truncate font-serif italic">
                    {profile?.username ? `@${profile.username}` : user?.email}
                  </p>
                </div>
              </div>
              {profile?.instrument && (
                <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">
                  {profile.instrument}{profile.genre ? ` · ${profile.genre_label || profile.genre}` : ""}
                </p>
              )}
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1">
              <MenuItem to="/profile" icon={<User className="h-4 w-4" />} onClick={() => setOpen(false)}>
                Your profile
              </MenuItem>
              <MenuItem to="/discover" icon={<Compass className="h-4 w-4" />} onClick={() => setOpen(false)}>
                Discover
                <span className="text-[10px] text-ink-soft font-serif italic ml-auto">find musicians</span>
              </MenuItem>
              <MenuItem to="/collegues" icon={<Users className="h-4 w-4" />} onClick={() => setOpen(false)}>
                Collegues
                <span className="text-[10px] text-ink-soft font-serif italic ml-auto">what others practice</span>
              </MenuItem>
              <MenuItem to="/library" icon={<FileMusic className="h-4 w-4" />} onClick={() => setOpen(false)}>
                Sheet music
                <span className="text-[10px] text-ink-soft font-serif italic ml-auto">your score library</span>
              </MenuItem>
              <MenuItem to="/ensembles" icon={<Music2 className="h-4 w-4" />} onClick={() => setOpen(false)}>
                Ensembles
                <span className="text-[10px] text-ink-soft font-serif italic ml-auto">groups & rehearsals</span>
              </MenuItem>
            </nav>

            <div className="mt-auto pt-6 border-t border-border">
              <button
                onClick={async () => { await signOut(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink-soft hover:bg-card hover:text-ink transition"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

const MenuItem = ({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink hover:bg-card transition group"
  >
    <span className="h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:border-ink/40 transition">
      {icon}
    </span>
    {children}
  </Link>
);
