import { supabase } from "@/integrations/supabase/client";

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export async function listMessagesWith(otherId: string): Promise<DirectMessage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

export async function sendMessage(recipientId: string, content: string): Promise<DirectMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message is empty");
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ sender_id: user.id, recipient_id: recipientId, content: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return data as DirectMessage;
}

export async function markConversationRead(otherId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherId)
    .eq("recipient_id", user.id)
    .is("read_at", null);
}

export type UnreadConversation = {
  other_id: string;
  unread_count: number;
  last_message: string;
  last_at: string;
  profile?: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function listUnreadConversations(): Promise<UnreadConversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("direct_messages")
    .select("sender_id, content, created_at")
    .eq("recipient_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as { sender_id: string; content: string; created_at: string }[];
  if (!rows.length) return [];
  const byOther = new Map<string, UnreadConversation>();
  for (const r of rows) {
    const existing = byOther.get(r.sender_id);
    if (existing) {
      existing.unread_count += 1;
    } else {
      byOther.set(r.sender_id, {
        other_id: r.sender_id,
        unread_count: 1,
        last_message: r.content,
        last_at: r.created_at,
      });
    }
  }
  const ids = Array.from(byOther.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  for (const p of (profiles ?? []) as any[]) {
    const c = byOther.get(p.id);
    if (c) c.profile = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  }
  return Array.from(byOther.values()).sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function countUnreadDMs(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("direct_messages")
    .select("id", { head: true, count: "exact" })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

export type ReadConversation = {
  other_id: string;
  last_message: string;
  last_at: string;
  last_from_me: boolean;
  profile?: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function listRecentReadConversations(days = 30): Promise<ReadConversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("sender_id, recipient_id, content, created_at, read_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (data ?? []) as { sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null }[];
  if (!rows.length) return [];

  // Track which conversations have ANY unread incoming messages — those belong in the Unread section, not history.
  const hasUnread = new Set<string>();
  for (const r of rows) {
    if (r.recipient_id === user.id && r.read_at === null) {
      hasUnread.add(r.sender_id);
    }
  }

  const byOther = new Map<string, ReadConversation>();
  for (const r of rows) {
    const other = r.sender_id === user.id ? r.recipient_id : r.sender_id;
    if (hasUnread.has(other)) continue;
    if (byOther.has(other)) continue; // first row is most recent due to order desc
    byOther.set(other, {
      other_id: other,
      last_message: r.content,
      last_at: r.created_at,
      last_from_me: r.sender_id === user.id,
    });
  }
  if (!byOther.size) return [];

  const ids = Array.from(byOther.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  for (const p of (profiles ?? []) as any[]) {
    const c = byOther.get(p.id);
    if (c) c.profile = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
  }
  return Array.from(byOther.values()).sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export function subscribeToConversation(
  otherId: string,
  onMessage: (m: DirectMessage) => void
) {
  const channel = supabase
    .channel(`dm:${otherId}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages" },
      (payload) => {
        const m = payload.new as DirectMessage;
        if (
          (m.sender_id === otherId || m.recipient_id === otherId)
        ) {
          onMessage(m);
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
