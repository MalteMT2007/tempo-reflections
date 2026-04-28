import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { BookOpen, Users, Users2, Search, Music2 } from "lucide-react";
import { GlobalSearchOverlay } from "./GlobalSearchOverlay";
import { useReaderChrome } from "@/hooks/useReaderChrome";

const dockItems = [
  { to: "/reader", label: "Reader", Icon: Music2 },
  { to: "/library", label: "Library", Icon: BookOpen },
  { to: "/ensembles", label: "Ensembles", Icon: Users, match: ["/ensembles"] },
  { to: "/spaces/rooms", label: "Rooms", Icon: Users2, match: ["/spaces"] },
];

export function BottomDock() {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const inReader = pathname === "/reader";
  const readerChromeVisible = useReaderChrome();

  // In reader: only show when user has tapped (chrome visible).
  // On overlay routes: always show.
  const visible = inReader ? readerChromeVisible : true;

  return (
    <>
      <nav
        aria-label="Primary"
        className={`fixed left-1/2 -translate-x-1/2 z-[50] pointer-events-none transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <ul
          className={`flex items-center gap-1 px-2 py-2 rounded-full border border-border/60 bg-background/75 backdrop-blur-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] ${
            visible ? "pointer-events-auto" : ""
          }`}
        >
          {dockItems.map(({ to, label, Icon, match }) => {
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
                  <Icon className="h-[20px] w-[20px]" strokeWidth={active ? 2.2 : 1.8} />
                </NavLink>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              title="Search"
              className="h-11 w-11 grid place-items-center rounded-full spring-tap text-foreground/70 hover:bg-muted transition-colors"
            >
              <Search className="h-[20px] w-[20px]" strokeWidth={1.8} />
            </button>
          </li>
        </ul>
      </nav>

      {searchOpen && <GlobalSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
