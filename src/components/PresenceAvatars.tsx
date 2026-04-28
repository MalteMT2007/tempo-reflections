import type { PresenceUser } from "@/hooks/useScorePresence";

const initials = (u: PresenceUser) => {
  const name = u.display_name || u.username || u.user_id;
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const palette = ["#c44a2c", "#2c6cc4", "#2c8c5a", "#c49b2c", "#7a3cc4", "#c43c8a"];
  return palette[h % palette.length];
};

export const PresenceAvatars = ({
  users,
  meId,
  max = 5,
}: {
  users: PresenceUser[];
  meId: string | null | undefined;
  max?: number;
}) => {
  const others = users.filter((u) => u.user_id !== meId);
  const ordered = [...users].sort((a, b) =>
    a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0
  );
  const shown = ordered.slice(0, max);
  const extra = ordered.length - shown.length;

  if (users.length <= 1) return null;

  return (
    <div className="pointer-events-auto flex items-center -space-x-2" title={`${users.length} viewers`}>
      {shown.map((u) => (
        <div
          key={u.user_id}
          className="h-7 w-7 rounded-full ring-2 ring-background overflow-hidden flex items-center justify-center text-[10px] font-semibold text-white"
          style={{ background: colorFor(u.user_id) }}
          title={u.display_name || u.username || "User"}
        >
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(u)
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="h-7 px-2 rounded-full ring-2 ring-background bg-ink/70 text-paper text-[10px] font-semibold flex items-center justify-center">
          +{extra}
        </div>
      )}
      {others.length > 0 && (
        <span className="ml-2 text-[11px] text-muted-foreground hidden sm:inline">
          {others.length} live
        </span>
      )}
    </div>
  );
};
