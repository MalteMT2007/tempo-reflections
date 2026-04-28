import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  listMessagesWith,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
  type DirectMessage,
} from "@/lib/messages";
import type { ColleagueProfile } from "@/lib/colleagues";

const TINTS = [
  "hsl(210 70% 92%)", "hsl(280 60% 92%)", "hsl(150 50% 90%)", "hsl(30 80% 90%)",
  "hsl(0 65% 92%)", "hsl(190 70% 90%)", "hsl(50 85% 90%)", "hsl(330 60% 92%)",
];
function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
function initials(name: string | null | undefined, fallback: string) {
  const s = (name || fallback || "?").trim();
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Messages() {
  const { id: otherId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [other, setOther] = useState<ColleagueProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!otherId) return;
    (async () => {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, instrument")
          .eq("id", otherId)
          .maybeSingle();
        if (prof) setOther(prof as ColleagueProfile);
        const msgs = await listMessagesWith(otherId);
        setMessages(msgs);
        await markConversationRead(otherId);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
    const unsub = subscribeToConversation(otherId, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.sender_id === otherId) markConversationRead(otherId);
    });
    return unsub;
  }, [otherId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const grouped = useMemo(() => {
    const out: { date: string; items: DirectMessage[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at).toDateString();
      const last = out[out.length - 1];
      if (last && last.date === d) last.items.push(m);
      else out.push({ date: d, items: [m] });
    }
    return out;
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherId || !text.trim() || sending) return;
    setSending(true);
    const optimistic: DirectMessage = {
      id: `tmp-${Date.now()}`,
      sender_id: me ?? "",
      recipient_id: otherId,
      content: text.trim(),
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    const body = text;
    setText("");
    try {
      const real = await sendMessage(otherId, body);
      setMessages((p) => p.map((m) => (m.id === optimistic.id ? real : m)));
    } catch (err: any) {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      setText(body);
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 sm:px-6 py-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 -ml-2 grid place-items-center rounded-full hover:bg-muted spring-tap"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other && (
          <>
            <Avatar className="h-10 w-10">
              <AvatarImage src={other.avatar_url ?? undefined} />
              <AvatarFallback
                className="text-foreground text-[13px] font-medium"
                style={{ backgroundColor: tintFor(other.id) }}
              >
                {initials(other.display_name, other.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate">
                {other.display_name || other.username}
              </div>
              <div className="text-[12px] text-muted-foreground truncate">@{other.username}</div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-[13px] text-muted-foreground mt-16">
            No messages yet. Say hello.
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date} className="space-y-1.5">
            <div className="text-center text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {new Date(group.date).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
            </div>
            {group.items.map((m, i) => {
              const mine = m.sender_id === me;
              const prev = group.items[i - 1];
              const grouped = prev && prev.sender_id === m.sender_id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-foreground text-background rounded-2xl rounded-br-md"
                        : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                    } ${grouped ? "mt-0.5" : "mt-2"}`}
                    title={formatTime(m.created_at)}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={onSend}
        className="border-t border-border px-3 sm:px-4 py-3 flex items-end gap-2 bg-background"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e as any);
            }
          }}
          placeholder="Message"
          rows={1}
          className="flex-1 resize-none max-h-32 rounded-3xl bg-muted px-4 py-2.5 text-[15px] outline-none border border-transparent focus:border-border placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="h-10 w-10 rounded-full bg-foreground text-background grid place-items-center spring-tap disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
