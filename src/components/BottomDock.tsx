import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Users, UserPlus, Users2 } from "lucide-react";

const items = [
  { to: "/library", label: "Library", Icon: BookOpen },
  { to: "/ensembles", label: "Ensembles", Icon: Users, match: ["/ensembles"] },
  { to: "/colleagues", label: "Colleagues", Icon: UserPlus },
  { to: "/spaces/rooms", label: "Rooms", Icon: Users2, match: ["/spaces"] },
];

export function BottomDock() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <ul
        className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full border border-border/60 bg-background/75 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)]"
      >
        {items.map(({ to, label, Icon, match }) => {
          const active =
            pathname === to ||
            (match?.some((m) => pathname === m || pathname.startsWith(m + "/")) ?? false);
          return (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={label}
                title={label}
                className={`group h-11 w-11 grid place-items-center rounded-full spring-tap transition-colors ${
                  active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon
                  className="h-[20px] w-[20px]"
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
