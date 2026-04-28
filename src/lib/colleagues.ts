import { supabase } from "@/integrations/supabase/client";

export type ColleagueProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instrument?: string | null;
};

export type ColleagueRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  profile: ColleagueProfile | null;
};

async function me() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export async function listColleagues(): Promise<ColleagueProfile[]> {
  const uid = await me();
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
  if (error) throw error;
  const otherIds = (data ?? []).map((r: any) =>
    r.requester_id === uid ? r.addressee_id : r.requester_id
  );
  if (!otherIds.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, instrument")
    .in("id", otherIds);
  return (profs ?? []) as any;
}

export async function listIncomingRequests(): Promise<ColleagueRequest[]> {
  const uid = await me();
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("status", "pending")
    .eq("addressee_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.requester_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, instrument")
    .in("id", ids);
  const m = new Map<string, ColleagueProfile>();
  for (const p of (profs ?? []) as any[]) m.set(p.id, p);
  return rows.map((r) => ({ ...r, profile: m.get(r.requester_id) ?? null }));
}

export async function listOutgoingRequests(): Promise<{ id: string; addressee_id: string }[]> {
  const uid = await me();
  const { data, error } = await supabase
    .from("friendships")
    .select("id, addressee_id")
    .eq("status", "pending")
    .eq("requester_id", uid);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function searchColleagues(q: string): Promise<ColleagueProfile[]> {
  const term = q.trim();
  if (!term) return [];
  const uid = await me();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, instrument")
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .neq("id", uid)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as any;
}

export async function sendRequest(addresseeId: string) {
  const uid = await me();
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: uid, addressee_id: addresseeId, status: "pending" });
  if (error) throw error;
}

export async function acceptRequest(id: string) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);
  if (error) throw error;
}

export async function declineRequest(id: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

export async function removeColleague(otherId: string) {
  const uid = await me();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${uid},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${uid})`
    );
  if (error) throw error;
}
