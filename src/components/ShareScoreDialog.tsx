import { useEffect, useState } from "react";
import { X, Users, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listScoreSharing,
  shareScoreWithEnsemble,
  unshareScoreFromEnsemble,
  type Score,
} from "@/lib/scores";
import { listMyEnsembles, type DbEnsemble } from "@/lib/api";

export function ShareScoreDialog({
  score,
  onClose,
}: {
  score: Score;
  onClose: () => void;
}) {
  const [ensembles, setEnsembles] = useState<DbEnsemble[]>([]);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const [mine, shares] = await Promise.all([
          listMyEnsembles(user.id),
          listScoreSharing(score.id),
        ]);
        if (!active) return;
        setEnsembles((mine ?? []).filter(Boolean));
        setSharedIds(new Set(shares.map((s) => s.ensemble_id)));
      } catch (e: any) {
        if (active) setError(e.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [score.id]);

  const toggle = async (ensembleId: string) => {
    setSavingId(ensembleId);
    setError(null);
    try {
      if (sharedIds.has(ensembleId)) {
        await unshareScoreFromEnsemble(score.id, ensembleId);
        setSharedIds((prev) => {
          const next = new Set(prev);
          next.delete(ensembleId);
          return next;
        });
      } else {
        await shareScoreWithEnsemble(score.id, ensembleId);
        setSharedIds((prev) => new Set(prev).add(ensembleId));
      }
    } catch (e: any) {
      setError(e.message || "Failed to update share");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-md p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[18px] font-semibold tracking-tight">Share score</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center spring-tap"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[13px] text-muted-foreground mb-4 truncate">
          {score.title}
          {score.composer ? ` — ${score.composer}` : ""}
        </p>

        {error && (
          <div className="mb-3 text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : ensembles.length === 0 ? (
          <div className="py-10 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-muted grid place-items-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.6} />
            </div>
            <p className="text-[14px] text-foreground">No ensembles yet</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Create or join an ensemble to share scores with others.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {ensembles.map((e) => {
              const shared = sharedIds.has(e.id);
              const saving = savingId === e.id;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => !saving && toggle(e.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left spring-tap"
                  >
                    <div className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{e.name}</p>
                      {e.type && (
                        <p className="text-[12px] text-muted-foreground capitalize">{e.type}</p>
                      )}
                    </div>
                    <div
                      className={`h-6 w-6 rounded-full grid place-items-center shrink-0 transition-colors ${
                        shared
                          ? "bg-foreground text-background"
                          : "border border-border"
                      }`}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : shared ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-[12px] text-muted-foreground">
          Shared scores appear in members' libraries with a "Shared" tag. Annotations sync live for everyone with access.
        </p>
      </div>
    </div>
  );
}
