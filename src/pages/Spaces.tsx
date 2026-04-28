import { useEffect, useState } from "react";
import { Hash, Sparkles } from "lucide-react";
import ColabrateFeed from "@/components/spaces/ColabrateFeed";
import RoomsPanel from "@/components/spaces/RoomsPanel";

type Tab = "discover" | "rooms";

export default function Spaces() {
  const [tab, setTab] = useState<Tab>("discover");

  useEffect(() => {
    document.title = "Spaces — Tempo";
  }, []);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="px-6 pt-6 pb-3 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Spaces</h1>
        </div>
        <div className="inline-flex rounded-xl bg-secondary p-1 gap-1">
          <button
            onClick={() => setTab("discover")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              tab === "discover"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4" /> Discover
          </button>
          <button
            onClick={() => setTab("rooms")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              tab === "rooms"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="h-4 w-4" /> Rooms
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "discover" ? <ColabrateFeed /> : <RoomsPanel />}
      </div>
    </div>
  );
}
