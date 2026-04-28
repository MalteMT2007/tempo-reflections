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
