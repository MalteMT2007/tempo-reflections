import { useEffect, useState } from "react";
import { Heart, MessageCircle, Loader2, MoreHorizontal, Trash2, Repeat2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Post,
  Comment,
  listAllPosts,
  listFollowingPosts,
  createPost,
  deletePost,
  toggleLike,
  toggleRepost,
  listComments,
  addComment,
} from "@/lib/social";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/ui/segmented";

type FeedTab = "following" | "all";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); return `${d}d`;
}

function initials(name?: string | null) {
  return ((name?.[0] || "?").toUpperCase());
}

function PostCard({
  post,
  onChanged,
  meId,
}: {
  post: Post;
  onChanged: () => void;
  meId: string | null;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadComments = async () => {
    try { setComments(await listComments(post.id)); }
    catch (e: any) { toast.error(e.message); }
  };
  const onToggleComments = async () => {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  };
  const onLike = async () => { try { await toggleLike(post.id, post.liked_by_me); onChanged(); } catch (e: any) { toast.error(e.message); } };
  const onRepost = async () => { try { await toggleRepost(post.id, post.reposted_by_me); onChanged(); } catch (e: any) { toast.error(e.message); } };
  const onSendComment = async () => {
    const text = commentText.trim(); if (!text) return;
    setBusy(true);
    try { await addComment(post.id, text); setCommentText(""); await loadComments(); onChanged(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const onDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try { await deletePost(post.id); onChanged(); } catch (e: any) { toast.error(e.message); }
  };

  const name = post.author?.display_name || post.author?.username || "Unknown";

  return (
    <article className="glass rounded-3xl p-5">
      <div className="flex gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={post.author?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-white/10 text-foreground text-sm">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[14px]">
            <span className="font-semibold truncate">{name}</span>
            <span className="text-foreground/40 truncate">@{post.author?.username}</span>
            <span className="text-foreground/30">·</span>
            <span className="text-foreground/40">{timeAgo(post.created_at)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto h-8 w-8 grid place-items-center rounded-full hover:bg-white/[0.08]" aria-label="More">
                  <MoreHorizontal className="h-4 w-4 text-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-strong border-white/15">
                <DropdownMenuItem onClick={onRepost}>
                  <Repeat2 className="h-4 w-4 mr-2" /> {post.reposted_by_me ? "Undo repost" : "Repost"}
                </DropdownMenuItem>
                {meId === post.author_id && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-2 text-[16px] leading-snug whitespace-pre-wrap break-words">{post.content}</p>

          <div className="mt-4 flex items-center gap-5 text-foreground/55 text-[13px]">
            <button onClick={onLike} className={`flex items-center gap-1.5 spring-tap transition-colors ${post.liked_by_me ? "text-rose-400" : "hover:text-rose-400"}`}>
              <Heart className={`h-[18px] w-[18px] ${post.liked_by_me ? "fill-rose-400" : ""}`} />
              {post.like_count > 0 && <span>{post.like_count}</span>}
            </button>
            <button onClick={onToggleComments} className="flex items-center gap-1.5 spring-tap hover:text-foreground transition-colors">
              <MessageCircle className="h-[18px] w-[18px]" />
              {post.comment_count > 0 && <span>{post.comment_count}</span>}
            </button>
          </div>

          {showComments && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={c.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-white/10 text-[10px]">{initials(c.author?.display_name || c.author?.username)}</AvatarFallback>
                    </Avatar>
                    <div className="text-[13.5px] glass rounded-2xl px-3 py-1.5">
                      <span className="font-semibold mr-2">{c.author?.display_name || c.author?.username}</span>
                      {c.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSendComment()}
                  placeholder="Reply"
                  className="flex-1 h-9 px-4 rounded-full glass-input text-[14px]"
                />
                <button
                  onClick={onSendComment}
                  disabled={busy || !commentText.trim()}
                  className="h-9 px-4 rounded-full pill-primary text-[13px] font-semibold disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ColabrateFeed() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeText, setComposeText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPosts(tab === "following" ? await listFollowingPosts() : await listAllPosts()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  useEffect(() => {
    const ch = supabase
      .channel("colabrate-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [tab]);

  const onPost = async () => {
    const text = composeText.trim(); if (!text || !user) return;
    setPosting(true);
    try { await createPost(text); setComposeText(""); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setPosting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 pb-20">
      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as FeedTab)}
          segments={[
            { value: "all", label: "All" },
            { value: "following", label: "Following" },
          ]}
        />
      </div>

      {/* Composer */}
      <div className="glass rounded-3xl p-4 mb-5">
        <div className="flex gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-white/10 text-foreground text-sm">{initials(user?.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              maxLength={500}
              placeholder="Share something"
              rows={2}
              className="w-full bg-transparent resize-none text-[16px] focus:outline-none placeholder:text-foreground/35"
            />
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={onPost}
                disabled={posting || !composeText.trim()}
                className="h-9 px-5 rounded-full pill-primary text-[13px] font-semibold disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="p-12 grid place-items-center text-foreground/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-foreground/45 text-[14px]">
          {tab === "following" ? "Follow people to fill your feed." : "No posts yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => <PostCard key={p.id} post={p} meId={user?.id ?? null} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}
