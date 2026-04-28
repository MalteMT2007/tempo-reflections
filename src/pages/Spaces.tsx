import { useEffect, useState } from "react";
import ColabrateFeed from "@/components/spaces/ColabrateFeed";
import RoomsPanel from "@/components/spaces/RoomsPanel";
import { Segmented } from "@/components/ui/segmented";

type Tab = "discover" | "rooms";

export default function Spaces() {
  const [tab, setTab] = useState<Tab>("discover");

  useEffect(() => { document.title = "Spaces — Tempo"; }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="px-6 md:px-10 pt-10">
        <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight">Spaces</h1>
        <div className="mt-5">
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            segments={[
              { value: "discover", label: "Discover" },
              { value: "rooms", label: "Rooms" },
            ]}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-6">
        <div key={tab} className="animate-fade-in h-full">
          {tab === "discover" ? <ColabrateFeed /> : <RoomsPanel />}
        </div>
      </div>
    </div>
  );
}
