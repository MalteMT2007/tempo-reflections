import { supabase } from "@/integrations/supabase/client";

export type DbProfile = {
  id: string;
  username: string;
  display_name: string | null;
  instrument: string | null;
  genre: string | null;
  genre_label: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as DbProfile | null;
}

export async function updateProfile(userId: string, patch: Partial<DbProfile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function searchProfiles(query: string, excludeId?: string) {
  const q = query.trim();
  if (!q) return [];
  let req = supabase
    .from("profiles")
    .select("id, username, display_name, instrument")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);
  if (excludeId) req = req.neq("id", excludeId);
  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

export async function listFriendships() {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

export async function requestFriend(addresseeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId });
  if (error) throw error;
}

export async function respondFriend(id: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) throw error;
  }
}

export async function removeFriend(id: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

// Sessions
export type DbSession = {
  id: string;
  user_id: string;
  title: string;
  byline: string | null;
  duration_sec: number;
  started_at: string;
  ended_at: string | null;
};

export async function recordSession(input: {
  title: string;
  byline?: string;
  duration_sec: number;
  started_at: number;
  ended_at: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("practice_sessions").insert({
    user_id: user.id,
    title: input.title,
    byline: input.byline || null,
    duration_sec: input.duration_sec,
    started_at: new Date(input.started_at).toISOString(),
    ended_at: new Date(input.ended_at).toISOString(),
  });
}

export async function friendsFeed(friendIds: string[]) {
  if (friendIds.length === 0) return [];
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .in("user_id", friendIds)
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as DbSession[];
}

// Ensembles
export type DbEnsemble = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export async function listMyEnsembles(userId: string) {
  const { data, error } = await supabase
    .from("ensemble_members")
    .select("ensemble_id, ensembles(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.ensembles as DbEnsemble);
}

export async function createEnsemble(name: string, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("ensembles")
    .insert({ name, description: description || null, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as DbEnsemble;
}

export async function ensembleMembers(ensembleId: string) {
  const { data, error } = await supabase
    .from("ensemble_members")
    .select("user_id, role, profiles:user_id(username, display_name, instrument)")
    .eq("ensemble_id", ensembleId);
  if (error) throw error;
  return data ?? [];
}

export async function joinEnsemble(ensembleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("ensemble_members")
    .insert({ ensemble_id: ensembleId, user_id: user.id });
  if (error) throw error;
}

export async function leaveEnsemble(ensembleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("ensemble_members")
    .delete()
    .eq("ensemble_id", ensembleId)
    .eq("user_id", user.id);
  if (error) throw error;
}
