import { supabase } from "@/integrations/supabase/client";

// ===== Posts =====
export type Post = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: ProfileLite | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  liked_by_me: boolean;
  reposted_by_me: boolean;
};

export type ProfileLite = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function attachAuthorsAndCounts(rows: any[]): Promise<Post[]> {
  if (!rows.length) return [];
  const me = await currentUserId();
  const ids = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));

  const [profilesRes, likesRes, commentsRes, repostsRes, myLikesRes, myRepostsRes] =
    await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds),
      supabase.from("post_likes").select("post_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
      supabase.from("post_reposts").select("post_id").in("post_id", ids),
      me
        ? supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", me)
        : Promise.resolve({ data: [] as any[], error: null }),
      me
        ? supabase.from("post_reposts").select("post_id").in("post_id", ids).eq("user_id", me)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

  const profiles = new Map<string, ProfileLite>();
  for (const p of (profilesRes.data ?? []) as any[]) profiles.set(p.id, p as ProfileLite);

  const tally = (arr: any[]) => {
    const m = new Map<string, number>();
    for (const r of arr ?? []) m.set(r.post_id, (m.get(r.post_id) ?? 0) + 1);
    return m;
  };
  const likes = tally(likesRes.data ?? []);
  const comments = tally(commentsRes.data ?? []);
  const reposts = tally(repostsRes.data ?? []);
  const myLikes = new Set((myLikesRes.data ?? []).map((r: any) => r.post_id));
  const myReposts = new Set((myRepostsRes.data ?? []).map((r: any) => r.post_id));

  return rows.map((r) => ({
    id: r.id,
    author_id: r.author_id,
    content: r.content,
    created_at: r.created_at,
    author: profiles.get(r.author_id) ?? null,
    like_count: likes.get(r.id) ?? 0,
    comment_count: comments.get(r.id) ?? 0,
    repost_count: reposts.get(r.id) ?? 0,
    liked_by_me: myLikes.has(r.id),
    reposted_by_me: myReposts.has(r.id),
  }));
}

export async function listAllPosts(limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachAuthorsAndCounts(data ?? []);
}

export async function listFollowingPosts(limit = 50): Promise<Post[]> {
  const me = await currentUserId();
  if (!me) return [];
  const { data: follows, error: fErr } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", me);
  if (fErr) throw fErr;
  const ids = (follows ?? []).map((r: any) => r.followee_id);
  ids.push(me); // include own posts
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, content, created_at")
    .in("author_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachAuthorsAndCounts(data ?? []);
}

export async function createPost(content: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase.from("posts").insert({ author_id: me, content });
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function toggleLike(postId: string, liked: boolean) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  if (liked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", me);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: me });
    if (error) throw error;
  }
}

export async function toggleRepost(postId: string, reposted: boolean) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  if (reposted) {
    const { error } = await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", me);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_reposts").insert({ post_id: postId, user_id: me });
    if (error) throw error;
  }
}

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: ProfileLite | null;
};

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, post_id, author_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const authorIds = Array.from(new Set(rows.map((r: any) => r.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);
  const m = new Map<string, ProfileLite>();
  for (const p of (profiles ?? []) as any[]) m.set(p.id, p);
  return rows.map((r: any) => ({ ...r, author: m.get(r.author_id) ?? null }));
}

export async function addComment(postId: string, content: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: me, content });
  if (error) throw error;
}

// ===== Rooms =====
export type Room = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  is_admin: boolean;
};

async function decorateRooms(rows: any[]): Promise<Room[]> {
  if (!rows.length) return [];
  const me = await currentUserId();
  const ids = rows.map((r) => r.id);
  const { data: members } = await supabase
    .from("room_members")
    .select("room_id, user_id, role")
    .in("room_id", ids);
  const counts = new Map<string, number>();
  const mine = new Map<string, { role: string }>();
  for (const m of (members ?? []) as any[]) {
    counts.set(m.room_id, (counts.get(m.room_id) ?? 0) + 1);
    if (me && m.user_id === me) mine.set(m.room_id, { role: m.role });
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    avatar_url: r.avatar_url,
    is_public: r.is_public,
    created_by: r.created_by,
    created_at: r.created_at,
    member_count: counts.get(r.id) ?? 0,
    is_member: mine.has(r.id),
    is_admin: mine.get(r.id)?.role === "admin",
  }));
}

export async function listMyRooms(): Promise<Room[]> {
  const me = await currentUserId();
  if (!me) return [];
  const { data: mems, error } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", me);
  if (error) throw error;
  const ids = (mems ?? []).map((r: any) => r.room_id);
  if (!ids.length) return [];
  const { data, error: rErr } = await supabase
    .from("rooms")
    .select("id, name, description, avatar_url, is_public, created_by, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (rErr) throw rErr;
  return decorateRooms(data ?? []);
}

export async function searchPublicRooms(q: string): Promise<Room[]> {
  let query = supabase
    .from("rooms")
    .select("id, name, description, avatar_url, is_public, created_by, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);
  if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return decorateRooms(data ?? []);
}

export async function createRoom(input: {
  name: string;
  description?: string;
  is_public: boolean;
  avatar_url?: string | null;
}): Promise<string> {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: input.name,
      description: input.description ?? null,
      is_public: input.is_public,
      avatar_url: input.avatar_url ?? null,
      created_by: me,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function joinPublicRoom(roomId: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("room_members")
    .insert({ room_id: roomId, user_id: me, role: "member" });
  if (error) throw error;
}

export async function leaveRoom(roomId: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", me);
  if (error) throw error;
}

export async function updateRoom(
  roomId: string,
  patch: { name?: string; description?: string | null; avatar_url?: string | null }
) {
  const { error } = await supabase.from("rooms").update(patch).eq("id", roomId);
  if (error) throw error;
}

export async function uploadRoomAvatar(roomId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${roomId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("room-avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("room-avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ===== Room messages =====
export type RoomMessage = {
  id: string;
  room_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: ProfileLite | null;
};

export async function listMessages(roomId: string, limit = 200): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from("room_messages")
    .select("id, room_id, author_id, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r: any) => r.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const m = new Map<string, ProfileLite>();
  for (const p of (profiles ?? []) as any[]) m.set(p.id, p);
  return rows.map((r: any) => ({ ...r, author: m.get(r.author_id) ?? null }));
}

export async function sendMessage(roomId: string, content: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("room_messages")
    .insert({ room_id: roomId, author_id: me, content });
  if (error) throw error;
}

// ===== Room invites =====
export type RoomInvite = {
  id: string;
  room_id: string;
  invitee_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  room?: { name: string; description: string | null } | null;
};

export async function listMyInvites(): Promise<RoomInvite[]> {
  const me = await currentUserId();
  if (!me) return [];
  const { data, error } = await supabase
    .from("room_invites")
    .select("id, room_id, invitee_id, invited_by, status, created_at")
    .eq("invitee_id", me)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const roomIds = Array.from(new Set(rows.map((r: any) => r.room_id)));
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, description")
    .in("id", roomIds);
  const m = new Map<string, any>();
  for (const r of (rooms ?? []) as any[]) m.set(r.id, r);
  return rows.map((r: any) => ({ ...r, room: m.get(r.room_id) ?? null }));
}

export async function inviteUserToRoom(roomId: string, inviteeId: string) {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("room_invites")
    .insert({ room_id: roomId, invitee_id: inviteeId, invited_by: me, status: "pending" });
  if (error) throw error;
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<string | null> {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { data: inv, error: iErr } = await supabase
    .from("room_invites")
    .select("id, room_id, invitee_id, status")
    .eq("id", inviteId)
    .single();
  if (iErr) throw iErr;
  const newStatus = accept ? "accepted" : "declined";
  const { error: uErr } = await supabase
    .from("room_invites")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (uErr) throw uErr;
  if (accept) {
    const { error: jErr } = await supabase
      .from("room_members")
      .insert({ room_id: inv.room_id, user_id: me, role: "member" });
    if (jErr && !String(jErr.message).includes("duplicate")) throw jErr;
    return inv.room_id;
  }
  return null;
}

export async function searchProfiles(q: string, excludeIds: string[] = []): Promise<ProfileLite[]> {
  const term = q.trim();
  if (!term) return [];
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(10);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).filter((p: any) => !excludeIds.includes(p.id)) as ProfileLite[];
}
