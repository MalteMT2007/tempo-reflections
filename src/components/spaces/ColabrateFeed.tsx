import { useEffect, useState } from "react";
import { Heart, MessageCircle, Repeat2, Send, Loader2, Trash2 } from "lucide-react";
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

type FeedTab = "following" | "all";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <div
      className="rounded-full bg-secondary text-foreground grid place-items-center font-medium overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? <img src={url} alt={name || ""} className="w-full h-full object-cover" /> : initial}
    </div>
  );
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
    try {
      const c = await listComments(post.id);
      setComments(c);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onToggleComments = async () => {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  };

  const onLike = async () => {
    try {
      await toggleLike(post.id, post.liked_by_me);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onRepost = async () => {
    try {
      await toggleRepost(post.id, post.reposted_by_me);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setBusy(true);
    try {
      await addComment(post.id, text);
      setCommentText("");
      await loadComments();
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost(post.id);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const name = post.author?.display_name || post.author?.username || "Unknown";

  return (
    <article className="px-5 py-4 border-b hover:bg-accent/30 transition-colors">
      <div className="flex gap-3">
        <Avatar url={post.author?.avatar_url} name={name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[14px]">
            <span className="font-semibold">{name}</span>
            <span className="text-muted-foreground">@{post.author?.username}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timeAgo(post.created_at)}</span>
            {meId === post.author_id && (
              <button
                onClick={onDelete}
                className="ml-auto text-muted-foreground hover:text-destructive p-1 rounded"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1 text-[15px] leading-snug whitespace-pre-wrap break-words">
            {post.content}
          </p>

          <div className="mt-3 flex items-center gap-6 text-muted-foreground text-[13px]">
            <button
              onClick={onToggleComments}
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              <span>{post.comment_count}</span>
            </button>
            <button
              onClick={onRepost}
              className={`flex items-center gap-1.5 transition-colors ${
                post.reposted_by_me ? "text-emerald-600" : "hover:text-emerald-600"
              }`}
            >
              <Repeat2 className="h-[18px] w-[18px]" />
              <span>{post.repost_count}</span>
            </button>
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 transition-colors ${
                post.liked_by_me ? "text-rose-600" : "hover:text-rose-600"
              }`}
            >
              <Heart className={`h-[18px] w-[18px] ${post.liked_by_me ? "fill-rose-600" : ""}`} />
              <span>{post.like_count}</span>
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-3">
              <div className="space-y-2 pl-1">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar url={c.author?.avatar_url} name={c.author?.display_name || c.author?.username} size={28} />
                    <div className="text-[13px] bg-secondary rounded-2xl px-3 py-2">
                      <span className="font-semibold mr-2">
                        {c.author?.display_name || c.author?.username}
                      </span>
                      {c.content}
                    </div>
                  </div>
                ))}
                {!comments.length && <p className="text-[13px] text-muted-foreground">No comments yet.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSendComment()}
                  placeholder="Write a comment..."
                  className="flex-1 h-9 px-3 rounded-full border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={onSendComment}
                  disabled={busy || !commentText.trim()}
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-50"
                >
                  Reply
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
  const [tab, setTab] = useState<FeedTab>("following");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeText, setComposeText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === "following" ? await listFollowingPosts() : await listAllPosts();
      setPosts(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Realtime: refresh when new posts arrive
  useEffect(() => {
    const ch = supabase
      .channel("colabrate-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onPost = async () => {
    const text = composeText.trim();
    if (!text || !user) return;
    setPosting(true);
    try {
      await createPost(text);
      setComposeText("");
      await load();
      toast.success("Posted to Colabrate");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="px-5 pt-4 pb-2 border-b flex items-center gap-6 text-[14px]">
        <button
          onClick={() => setTab("following")}
          className={`pb-2 font-medium transition-colors ${
            tab === "following" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setTab("all")}
          className={`pb-2 font-medium transition-colors ${
            tab === "all" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"
          }`}
        >
          All Colabrate
        </button>
      </div>

      {/* Composer */}
      <div className="px-5 py-4 border-b">
        <div className="flex gap-3">
          <Avatar url={null} name={user?.email || "U"} />
          <div className="flex-1">
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              maxLength={500}
              placeholder="Share a tip, question, or thought…"
              rows={2}
              className="w-full bg-transparent resize-none text-[15px] focus:outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[12px] text-muted-foreground">
                {composeText.length}/500 · Posts to Colabrate
              </span>
              <button
                onClick={onPost}
                disabled={posting || !composeText.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-12 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-[14px]">
            {tab === "following"
              ? "No posts yet — follow people from the Profile tab to fill your feed, or switch to All Colabrate."
              : "No posts yet. Be the first to share something."}
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} meId={user?.id ?? null} onChanged={load} />)
        )}
      </div>
    </div>
  );
}
