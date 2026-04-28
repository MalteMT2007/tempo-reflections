import { useLocation, useNavigate } from "react-router-dom";
import { Menu, UserPlus, Bell, User, Compass, Users2, Home as HomeIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useReaderChrome } from "@/hooks/useReaderChrome";

const items = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/colleagues", label: "Colleagues", Icon: UserPlus },
  { to: "/inbox", label: "Inbox", Icon: Bell },
  { to: "/spaces", label: "Spaces", Icon: Users2 },
  { to: "/discover", label: "Discover", Icon: Compass },
  { to: "/profile", label: "Profile", Icon: User },
];

export function ReaderHamburger() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inReader = pathname === "/reader";
  const readerChromeVisible = useReaderChrome();
  const visible = inReader ? readerChromeVisible : true;

  return (
    <div
      className={`fixed z-[50] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Open menu"
            className="h-11 w-11 grid place-items-center rounded-full border border-border/60 bg-background/75 backdrop-blur-xl text-foreground shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] spring-tap"
          >
            <Menu className="h-[20px] w-[20px]" strokeWidth={1.8} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-48 p-1 rounded-2xl border border-border/60 bg-background/90 backdrop-blur-xl z-[60]"
        >
          <ul className="flex flex-col">
            {items.map(({ to, label, Icon }) => (
              <li key={to}>
                <button
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-foreground hover:bg-muted spring-tap"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
