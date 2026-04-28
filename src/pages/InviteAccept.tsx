import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { acceptInvite } from "@/lib/ensembles";
import { toast } from "sonner";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav(`/auth?redirect=/invites/${token}`, { replace: true }); return; }
    if (!token) return;
    (async () => {
      try {
        const ensembleId = await acceptInvite(token);
        toast.success("Joined ensemble");
        nav(`/ensembles/${ensembleId}`, { replace: true });
      } catch (e: any) {
        setError(e.message ?? "Could not accept invite");
      }
    })();
  }, [token, user, loading]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      {error ? (
        <div className="text-center max-w-sm">
          <p className="font-serif text-2xl text-ink mb-2">Invite unavailable</p>
          <p className="text-sm text-ink-soft">{error}</p>
        </div>
      ) : (
        <div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-ink-soft mx-auto mb-2" /><p className="text-sm text-ink-soft">Joining…</p></div>
      )}
    </main>
  );
}
