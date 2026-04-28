import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { X, Music2, Users, BookOpen, Hash, UserPlus } from "lucide-react";

const items = [
  { to: "/practise", label: "Practice", Icon: Music2 },
  { to: "/ensembles", label: "Ensemble", Icon: Users },
  { to: "/library", label: "Library", Icon: BookOpen },
  { to: "/spaces", label: "Social", Icon: Hash },
  { to: "/colleagues", label: "Colleagues", Icon: UserPlus },
];

export function TopMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-[82%] max-w-sm bg-background border-l border-border shadow-elev flex flex-col animate-fade-in"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <span className="text-[15px] font-semibold tracking-tight">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted spring-tap"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-3 h-12 rounded-xl spring-tap transition-colors ${
                  isActive ? "bg-muted" : "hover:bg-muted/60"
                }`
              }
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} style={{ color: "#007AFF" }} />
              <span className="text-[16px] text-foreground">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
