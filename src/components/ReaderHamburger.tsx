import { useNavigate } from "react-router-dom";
import { BookOpen, Menu, Users, UserPlus, Users2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const items = [
  { to: "/library", label: "Library", Icon: BookOpen },
  { to: "/ensembles", label: "Ensembles", Icon: Users },
  { to: "/colleagues", label: "Colleagues", Icon: UserPlus },
  { to: "/spaces/rooms", label: "Rooms", Icon: Users2 },
];

export function ReaderHamburger() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        right: "calc(env(safe-area-inset-right, 0px) + 16px)",
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Open menu"
            className="pointer-events-auto h-11 w-11 grid place-items-center rounded-full border border-border/60 bg-background/75 backdrop-blur-xl text-foreground shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] spring-tap"
          >
            <Menu className="h-[20px] w-[20px]" strokeWidth={1.8} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="pointer-events-auto w-48 p-1 rounded-2xl border border-border/60 bg-background/90 backdrop-blur-xl"
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
