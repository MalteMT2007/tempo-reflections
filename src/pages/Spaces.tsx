import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, Plus, MessageCircle } from "lucide-react";
import { listMyRooms, type Room } from "@/lib/social";
import { PagePillFrame, GlassPill, PillSectionHeader, BrowseCta } from "@/components/PagePill";

export default function Spaces() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Spaces — Tempo"; }, []);

  useEffect(() => {
    listMyRooms()
      .then(setRooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top = rooms.slice(0, 5);

  return (
    <PagePillFrame>
      <GlassPill>
        <PillSectionHeader icon={MessageCircle} label="Spaces" />
        <h1 className="mt-1.5 text-[28px] font-light tracking-tight leading-tight">Conversations.</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1">
          Group chats and shared rooms with your fellow musicians.
        </p>
        <BrowseCta icon={Plus} label="New room" onClick={() => navigate("/spaces/rooms")} />
      </GlassPill>

      <GlassPill>
        <PillSectionHeader icon={Users2} label="Your rooms" count={rooms.length} />
        {loading ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">No rooms yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/40">
            {top.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => navigate(`/spaces/rooms?id=${r.id}`)}
                  className="w-full flex items-center gap-3 py-2.5 text-left spring-tap"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-muted/60 overflow-hidden grid place-items-center">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-[14px] font-medium truncate flex-1">{r.name}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <BrowseCta icon={Users2} label="Browse all rooms" onClick={() => navigate("/spaces/rooms")} />
      </GlassPill>
    </PagePillFrame>
  );
}
