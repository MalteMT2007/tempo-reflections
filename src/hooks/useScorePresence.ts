import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceUser = {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  online_at: string;
};

/**
 * Tracks which users are currently viewing a score, via a Supabase Realtime
 * presence channel scoped to the score id.
 */
export function useScorePresence(scoreId: string | null | undefined, me: PresenceUser | null) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!scoreId || !me?.user_id) return;

    const channel = supabase.channel(`score-presence:${scoreId}`, {
      config: { presence: { key: me.user_id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const flat: PresenceUser[] = [];
        Object.values(state).forEach((arr) => {
          if (arr && arr.length > 0) flat.push(arr[0] as PresenceUser);
        });
        setUsers(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(me);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scoreId, me?.user_id, me?.avatar_url, me?.display_name, me?.username]);

  return users;
}
