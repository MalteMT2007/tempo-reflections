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
  onboarding_complete?: boolean;
};

// --- Username helpers ---
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function validateUsername(name: string): string | null {
  const v = name.trim();
  if (v.length < 3) return "Minst 3 tecken";
  if (v.length > 20) return "Max 20 tecken";
  if (!USERNAME_RE.test(v)) return "Endast a–z, 0–9, _";
  return null;
}

export async function checkUsernameAvailable(name: string): Promise<boolean> {
  const v = name.trim().toLowerCase();
  if (validateUsername(v)) return false;
  const { data, error } = await supabase.rpc("username_available", { _name: v });
  if (error) throw error;
  return !!data;
}

// --- Avatars ---
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// --- Follows ---
export type FollowRow = { id: string; follower_id: string; followee_id: string; created_at: string };

export async function followUser(followeeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  if (error) throw error;
}

export async function unfollowUser(followeeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId);
  if (error) throw error;
}

export async function listFollowing(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.followee_id);
}

export async function listFollowers(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.follower_id);
}

export async function discoverProfiles(query: string, excludeId?: string) {
  const q = query.trim();
  let req = supabase
    .from("profiles")
    .select("id, username, display_name, instrument, bio, avatar_url")
    .eq("onboarding_complete", true)
    .limit(40);
  if (q) req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  if (excludeId) req = req.neq("id", excludeId);
  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}

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
export type EnsembleType = "orchestra" | "band" | "choir";

export type DbEnsemble = {
  id: string;
  name: string;
  description: string | null;
  type: EnsembleType | null;
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

export async function createEnsemble(name: string, type: EnsembleType, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("ensembles")
    .insert({ name, type, description: description || null, created_by: user.id })
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
