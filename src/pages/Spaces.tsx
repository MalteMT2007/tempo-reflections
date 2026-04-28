import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import ColabrateFeed from "@/components/spaces/ColabrateFeed";
import { useState } from "react";
import { listMyRooms, type Room } from "@/lib/social";

export default function Spaces() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => { document.title = "Spaces — Tempo"; }, []);

  useEffect(() => {
    listMyRooms().then(setRooms).catch(() => {});
  }, [loc.key]);

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10 pb-20">
      <PageHeader
        title="Spaces"
        trailing={
          <button
            onClick={() => navigate("/spaces/rooms")}
            className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            All rooms
          </button>
        }
      />

      {/* Rooms strip — horizontal, top */}
      <div className="mt-6 -mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => navigate("/spaces/rooms")}
            className="shrink-0 flex flex-col items-center gap-1.5 group"
            aria-label="New room"
          >
            <div className="h-14 w-14 rounded-full border border-dashed border-border grid place-items-center group-hover:border-foreground/40 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <span className="text-[11px] text-muted-foreground">New</span>
          </button>
          {rooms.length === 0 ? (
            <div className="self-center pl-3 text-[13px] text-muted-foreground">
              Join rooms to chat with groups.
            </div>
          ) : (
            rooms.slice(0, 12).map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/spaces/rooms?id=${r.id}`)}
                className="shrink-0 flex flex-col items-center gap-1.5 group"
              >
                <div className="h-14 w-14 rounded-full bg-muted overflow-hidden grid place-items-center spring-tap">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    <Users2 className="h-5 w-5" strokeWidth={1.6} />
                  )}
                </div>
                <span className="text-[11px] text-foreground/80 max-w-[64px] truncate">{r.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Vertical feed */}
      <div className="mt-8">
        <ColabrateFeed />
      </div>
    </div>
  );
}
