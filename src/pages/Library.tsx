import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  FileMusic,
  Trash2,
  X,
  AlertCircle,
  Upload,
  MoreHorizontal,
  Star,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Share2,
  Sparkles,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  Score,
  deleteScore,
  listMyScores,
  setScoreFavorite,
  uploadScore,
} from "@/lib/scores";
import { supabase } from "@/integrations/supabase/client";
import { listProjects, type Project } from "@/lib/ensembles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { GlassPill } from "@/components/PagePill";
import { setBackgroundScore } from "@/components/LiveScoreReaderHost";
import { markScoreOpened, getOpenedAt } from "@/lib/recentScores";
import { ShareScoreDialog } from "@/components/ShareScoreDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  type Collection,
  type EnsembleCollection,
  buildComposerCollections,
  buildInstrumentCollections,
  buildTagCollections,
  formatDuration,
  formatRelative,
  getPracticeStatsByScore,
  listMyEnsembleCollections,
  listScoreIdsInEnsemble,
} from "@/lib/library";
import {
  type SetlistWithCount,
  createSetlist,
  deleteSetlist,
  listMySetlists,
  listSetlistScoreIds,
  addScoreToSetlist,
} from "@/lib/setlists";

type CategoryKey =
  | "recent"
  | "folders"
  | "composers"
  | "instruments"
  | "ensembles"
  | "concerts"
  | "shared"
  | "favorites"
  | "all";

type Sort = "az" | "za" | "recent" | "most_practiced";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "recent", label: "Senaste" },
  { key: "folders", label: "Mappar" },
  { key: "composers", label: "Kompositörer" },
  { key: "instruments", label: "Instrument" },
  { key: "ensembles", label: "Ensembler" },
  { key: "concerts", label: "Konserter" },
  { key: "shared", label: "Delat" },
  { key: "favorites", label: "Favoriter" },
  { key: "all", label: "Alla" },
];

const SORT_LABEL: Record<Sort, string> = {
  recent: "Senast öppnad",
  az: "A–Z",
  za: "Z–A",
  most_practiced: "Mest övad",
};

const Library = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scores, setScores] = useState<Score[]>([]);
  const [stats, setStats] = useState<Map<string, { seconds: number; sessions: number; last: string | null }>>(new Map());
  const [ensembles, setEnsembles] = useState<EnsembleCollection[]>([]);
  const [setlists, setSetlists] = useState<SetlistWithCount[]>([]);

  const [category, setCategory] = useState<CategoryKey>("recent");
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const [drilldownLabel, setDrilldownLabel] = useState<string>("");
  const [drilldownScoreIds, setDrilldownScoreIds] = useState<Set<string> | null>(null);

  const [sort, setSort] = useState<Sort>("recent");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const openInReader = (s: Score) => {
    markScoreOpened(s.id);
    setBackgroundScore(s);
    navigate("/reader");
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyScores();
      setScores(list);
      if (user?.id) {
        const [m, ens, sets] = await Promise.all([
          getPracticeStatsByScore(list, user.id),
          listMyEnsembleCollections(user.id),
          listMySetlists(),
        ]);
        setStats(m);
        setEnsembles(ens);
        setSetlists(sets);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte ladda biblioteket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    document.title = "Library — Tempo";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handle ?open=<scoreId> from global search
  useEffect(() => {
    const id = searchParams.get("open");
    if (!id || scores.length === 0) return;
    const match = scores.find((s) => s.id === id);
    if (match) {
      openInReader(match);
      searchParams.delete("open");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, scores]);

  // Reset drill-down when switching category
  useEffect(() => {
    setDrilldownId(null);
    setDrilldownLabel("");
    setDrilldownScoreIds(null);
  }, [category]);

  // Build the second pill's options
  const drilldownOptions: Collection[] = useMemo(() => {
    switch (category) {
      case "folders":      return buildTagCollections(scores);
      case "composers":    return buildComposerCollections(scores);
      case "instruments":  return buildInstrumentCollections(scores);
      case "ensembles":    return ensembles;
      case "concerts":     return setlists.map((s) => ({
        kind: "concert" as const,
        id: s.id,
        label: s.name,
        count: s.score_count,
        subtitle: s.occasion_date
          ? new Date(s.occasion_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : `${s.score_count} stycken`,
      }));
      default: return [];
    }
  }, [category, scores, ensembles, setlists]);

  // Filter scores based on category + drill-down
  const filteredScores = useMemo(() => {
    let arr = scores;

    if (category === "favorites") arr = arr.filter((s) => s.favorite);
    else if (category === "shared") arr = arr.filter((s) => user && s.owner_id !== user.id);
    else if (category === "recent") {
      // Only those with a known opened/practice date — but show all if nothing yet.
      arr = [...arr];
    }

    if (drilldownId) {
      if (category === "folders")        arr = arr.filter((s) => (s.tags || []).includes(drilldownId));
      else if (category === "composers")  arr = arr.filter((s) => s.composer === drilldownId);
      else if (category === "instruments") arr = arr.filter((s) => s.instrument === drilldownId);
      else if (drilldownScoreIds)         arr = arr.filter((s) => drilldownScoreIds.has(s.id));
    }

    // Sort
    const sorted = [...arr];
    if (sort === "az") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else if (sort === "za") {
      sorted.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    } else if (sort === "most_practiced") {
      sorted.sort((a, b) => (stats.get(b.id)?.seconds ?? 0) - (stats.get(a.id)?.seconds ?? 0));
    } else {
      // recent (last opened locally OR last practiced OR updated_at)
      sorted.sort((a, b) => {
        const ao = getOpenedAt(a.id) || (stats.get(a.id)?.last ? new Date(stats.get(a.id)!.last!).getTime() : 0) || new Date(a.updated_at || a.created_at).getTime();
        const bo = getOpenedAt(b.id) || (stats.get(b.id)?.last ? new Date(stats.get(b.id)!.last!).getTime() : 0) || new Date(b.updated_at || b.created_at).getTime();
        return bo - ao;
      });
    }
    return sorted;
  }, [scores, category, drilldownId, drilldownScoreIds, sort, stats, user]);

  // Recently played strip — shown only on "Senaste"
  const recentlyPlayed = useMemo(() => {
    if (category !== "recent" || drilldownId) return [];
    return [...scores]
      .map((s) => ({
        s,
        ts: getOpenedAt(s.id) || (stats.get(s.id)?.last ? new Date(stats.get(s.id)!.last!).getTime() : 0),
      }))
      .filter((x) => x.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map((x) => x.s);
  }, [category, drilldownId, scores, stats]);

  const handleDrilldownSelect = async (col: Collection) => {
    setDrilldownId(col.id);
    setDrilldownLabel(col.label);
    if (col.kind === "ensemble") {
      try {
        const ids = await listScoreIdsInEnsemble(col.id);
        setDrilldownScoreIds(new Set(ids));
      } catch {
        setDrilldownScoreIds(new Set());
      }
    } else if (col.kind === "concert") {
      try {
        const ids = await listSetlistScoreIds(col.id);
        setDrilldownScoreIds(new Set(ids));
      } catch {
        setDrilldownScoreIds(new Set());
      }
    } else {
      setDrilldownScoreIds(null);
    }
  };

  const isInDrilldown = drilldownId !== null;
  const showCollectionsView =
    !isInDrilldown &&
    (category === "folders" || category === "composers" || category === "instruments" || category === "ensembles" || category === "concerts");

  return (
    <>
      <GlassPill>
        <PageHeader
          title="Library"
          trailing={
            <button
              onClick={() => setUploadOpen(true)}
              aria-label="Lägg till noter"
              className="h-10 w-10 grid place-items-center rounded-full bg-foreground text-background spring-tap"
            >
              <Plus className="h-5 w-5" strokeWidth={2.2} />
            </button>
          }
        />

        {/* === PILL 1 — kategori === */}
        <div className="mt-3 -mx-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 px-1 pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`h-9 px-3.5 rounded-full text-[13.5px] whitespace-nowrap transition spring-tap ${
                  category === c.key
                    ? "bg-foreground text-background"
                    : "bg-muted/70 text-foreground/75 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* === PILL 2 — drill-down (visas när det finns barn) === */}
        {(showCollectionsView || isInDrilldown) && drilldownOptions.length > 0 && (
          <div className="mt-2 -mx-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 px-1 pb-1">
              {isInDrilldown && (
                <button
                  onClick={() => { setDrilldownId(null); setDrilldownLabel(""); setDrilldownScoreIds(null); }}
                  className="h-8 px-3 rounded-full bg-muted text-[12.5px] text-foreground/80 inline-flex items-center gap-1 spring-tap"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Tillbaka
                </button>
              )}
              {drilldownOptions.map((d) => (
                <button
                  key={`${d.kind}:${d.id}`}
                  onClick={() => handleDrilldownSelect(d)}
                  className={`h-8 px-3 rounded-full text-[12.5px] whitespace-nowrap transition ${
                    drilldownId === d.id
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted/50 text-foreground/65 hover:text-foreground"
                  }`}
                >
                  {d.label}
                  <span className="ml-1.5 text-foreground/45 tabular-nums">{d.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort + count */}
        <div className="mt-4 mb-3 flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {isInDrilldown ? drilldownLabel : CATEGORIES.find((c) => c.key === category)?.label}
            {" · "}
            {filteredScores.length} {filteredScores.length === 1 ? "stycke" : "stycken"}
          </p>
          <SortMenu sort={sort} onChange={setSort} />
        </div>

        {/* Recently played strip on Senaste */}
        {category === "recent" && recentlyPlayed.length > 0 && !isInDrilldown && (
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-wider text-foreground/45 mb-2">Senast spelade</p>
            <div className="-mx-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 px-1 pb-1">
                {recentlyPlayed.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openInReader(s)}
                    className="shrink-0 h-9 px-3.5 rounded-full bg-muted/60 hover:bg-muted text-[13px] text-foreground/85 max-w-[200px] truncate spring-tap"
                    title={s.title}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <LoadingList />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : showCollectionsView ? (
          drilldownOptions.length === 0 ? (
            category === "concerts" ? (
              <ConcertsEmpty onCreated={refresh} />
            ) : (
              <EmptyHint message={`Inga ${CATEGORIES.find((c) => c.key === category)?.label.toLowerCase()} ännu.`} />
            )
          ) : (
            <CollectionList items={drilldownOptions} onSelect={handleDrilldownSelect} />
          )
        ) : filteredScores.length === 0 ? (
          <EmptyState empty={scores.length === 0} onAdd={() => setUploadOpen(true)} />
        ) : (
          <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
            {filteredScores.map((s) => (
              <ScoreRow
                key={s.id}
                score={s}
                stats={stats.get(s.id)}
                onOpen={() => openInReader(s)}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}

        {/* Concert management when on concerts category */}
        {category === "concerts" && !isInDrilldown && setlists.length > 0 && (
          <div className="mt-4">
            <CreateConcertButton onCreated={refresh} />
          </div>
        )}
      </GlassPill>

      {uploadOpen && (
        <UploadDialog
          existingCategories={Array.from(
            new Set(scores.flatMap((s) => s.tags || []).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b))}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); refresh(); }}
        />
      )}
    </>
  );
};

export default Library;

// ---------- Sort menu ----------
const SortMenu = ({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) => {
  const Icon = sort === "az" ? ArrowDownAZ : sort === "za" ? ArrowUpAZ : sort === "most_practiced" ? Sparkles : Clock;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Sortera"
          className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 rounded-full bg-muted text-[13px] text-foreground spring-tap"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {SORT_LABEL[sort]}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onChange("recent")}>
          <Clock className="h-4 w-4 mr-2" /> Senast öppnad
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("most_practiced")}>
          <Sparkles className="h-4 w-4 mr-2" /> Mest övad
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("az")}>
          <ArrowDownAZ className="h-4 w-4 mr-2" /> A–Z
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("za")}>
          <ArrowUpAZ className="h-4 w-4 mr-2" /> Z–A
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ---------- Collection list ----------
const CollectionList = ({ items, onSelect }: { items: Collection[]; onSelect: (c: Collection) => void }) => (
  <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
    {items.map((c) => (
      <li key={`${c.kind}:${c.id}`}>
        <button
          onClick={() => onSelect(c)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/60 transition spring-tap"
        >
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-foreground truncate">{c.label}</p>
            {c.subtitle && <p className="text-[12px] text-muted-foreground truncate mt-0.5">{c.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <span className="text-[12px] tabular-nums text-muted-foreground">{c.count}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </li>
    ))}
  </ul>
);

// ---------- Score row (with stats) ----------
const ScoreRow = ({
  score,
  stats,
  onOpen,
  onChanged,
}: {
  score: Score;
  stats?: { seconds: number; sessions: number; last: string | null };
  onOpen: () => void;
  onChanged: () => void;
}) => {
  const { user } = useAuth();
  const isShared = !!user && user.id !== score.owner_id;
  return (
    <li className="flex items-center gap-2 pr-2 hover:bg-muted/60 transition-colors">
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left flex items-center gap-3 px-4 py-3.5 spring-tap"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {score.favorite && <Star className="h-3 w-3 fill-foreground text-foreground shrink-0" />}
            <p className="text-[15px] font-medium text-foreground truncate leading-tight">
              {score.title}
            </p>
            {isShared && <SharedBadge />}
          </div>
          <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
            {[score.composer, score.instrument].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {/* Practice stats */}
        <div className="text-right shrink-0">
          <p className="text-[12.5px] text-foreground/80 tabular-nums">
            {stats?.seconds ? formatDuration(stats.seconds) : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stats?.last ? formatRelative(stats.last) : (score.page_count ? `${score.page_count} sid.` : "")}
          </p>
        </div>
      </button>
      <ScoreActionsMenu score={score} onChanged={onChanged} />
    </li>
  );
};

// ---------- Score actions menu ----------
const ScoreActionsMenu = ({
  score,
  onChanged,
}: {
  score: Score;
  onChanged: () => void;
}) => {
  const { user } = useAuth();
  const isOwner = !!user && user.id === score.owner_id;
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const toggleFav = async (e: Event) => {
    e.preventDefault();
    try { await setScoreFavorite(score.id, !score.favorite); onChanged(); } catch {}
  };
  const remove = async (e: Event) => {
    e.preventDefault();
    if (!confirm(`Ta bort "${score.title}"?`)) return;
    try { await deleteScore(score); onChanged(); } catch {}
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label="Fler åtgärder"
            className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground spring-tap"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={toggleFav}>
            <Star className={`h-4 w-4 mr-2 ${score.favorite ? "fill-current" : ""}`} />
            {score.favorite ? "Ta bort favorit" : "Favorit"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAddOpen(true); }}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Lägg till i konsert…
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShareOpen(true); }}>
              <Share2 className="h-4 w-4 mr-2" />
              Dela med ensemble…
            </DropdownMenuItem>
          )}
          {isOwner && (
            <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Ta bort
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {shareOpen && (
        <ShareScoreDialog score={score} onClose={() => { setShareOpen(false); onChanged(); }} />
      )}
      {addOpen && (
        <AddToConcertDialog
          score={score}
          onClose={() => { setAddOpen(false); onChanged(); }}
        />
      )}
    </>
  );
};

const SharedBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">
    Delad
  </span>
);

// ---------- States ----------
const LoadingList = () => (
  <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
    {Array.from({ length: 6 }).map((_, i) => (
      <li key={i} className="flex items-center gap-4 px-4 py-3.5">
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-3 w-12 rounded bg-muted animate-pulse" />
      </li>
    ))}
  </ul>
);

const EmptyState = ({ empty, onAdd }: { empty: boolean; onAdd: () => void }) => (
  <div className="text-center py-16">
    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted grid place-items-center mb-4">
      <FileMusic className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <p className="text-[17px] font-medium text-foreground">
      {empty ? "Inga noter ännu" : "Inget att visa"}
    </p>
    <p className="text-[14px] text-muted-foreground mt-1">
      {empty ? "Lägg till din första PDF för att komma igång." : "Prova en annan kategori."}
    </p>
    {empty && (
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-[14px] font-medium spring-tap"
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} /> Lägg till PDF
      </button>
    )}
  </div>
);

const EmptyHint = ({ message }: { message: string }) => (
  <div className="text-center py-12">
    <p className="text-[13px] text-muted-foreground">{message}</p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="text-center py-16">
    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted grid place-items-center mb-4">
      <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
    </div>
    <p className="text-[17px] font-medium text-foreground">Något gick fel</p>
    <p className="text-[14px] text-muted-foreground mt-1 max-w-xs mx-auto">{message}</p>
    <button
      onClick={onRetry}
      className="mt-5 inline-flex h-10 px-5 items-center rounded-full bg-foreground text-background text-[14px] font-medium spring-tap"
    >
      Försök igen
    </button>
  </div>
);

// ---------- Concerts ----------
const CreateConcertButton = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-muted hover:bg-muted/80 text-[13px] text-foreground spring-tap"
      >
        <Plus className="h-3.5 w-3.5" /> Ny konsert
      </button>
      {open && <CreateConcertDialog onClose={() => setOpen(false)} onCreated={() => { setOpen(false); onCreated(); }} />}
    </>
  );
};

const ConcertsEmpty = ({ onCreated }: { onCreated: () => void }) => (
  <div className="text-center py-12">
    <p className="text-[14px] text-foreground">Inga konserter ännu</p>
    <p className="text-[13px] text-muted-foreground mt-1">Skapa en setlista för en föreställning.</p>
    <div className="mt-4">
      <CreateConcertButton onCreated={onCreated} />
    </div>
  </div>
);

const CreateConcertDialog = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) { setErr("Namn krävs"); return; }
    setBusy(true); setErr(null);
    try {
      await createSetlist({ name: name.trim(), occasion_date: date || null });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kunde inte skapa");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px] font-semibold">Ny konsert</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Namn (t.ex. Vårkonsert)"
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]"
          />
          <input
            type="date"
            value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]"
          />
        </div>
        {err && <p className="text-xs text-destructive mt-3">{err}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-6 w-full bg-foreground text-background rounded-full py-3 disabled:opacity-50 text-[14px] font-medium spring-tap"
        >
          {busy ? "Skapar…" : "Skapa konsert"}
        </button>
      </div>
    </div>
  );
};

const AddToConcertDialog = ({ score, onClose }: { score: Score; onClose: () => void }) => {
  const [setlists, setSetlists] = useState<SetlistWithCount[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listMySetlists().then(setSetlists).catch(() => {});
  }, []);

  const add = async (id: string) => {
    setBusy(true); setErr(null);
    try { await addScoreToSetlist(id, score.id); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Kunde inte lägga till"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px] font-semibold">Lägg till i konsert</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        {creating ? (
          <CreateConcertDialog
            onClose={() => setCreating(false)}
            onCreated={() => { setCreating(false); listMySetlists().then(setSetlists); }}
          />
        ) : (
          <>
            {setlists.length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">Du har inga konserter ännu.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {setlists.map((s) => (
                  <li key={s.id}>
                    <button
                      disabled={busy}
                      onClick={() => add(s.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted disabled:opacity-50"
                    >
                      <span className="text-[14px] text-foreground">{s.name}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{s.score_count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-muted text-[13px] spring-tap"
            >
              <Plus className="h-3.5 w-3.5" /> Ny konsert
            </button>
            {err && <p className="text-xs text-destructive mt-3">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Upload Dialog (with AI suggestion) ----------
type AdminEnsemble = { id: string; name: string; projects: Project[] };

const UploadDialog = ({
  existingCategories,
  onClose,
  onUploaded,
}: {
  existingCategories: string[];
  onClose: () => void;
  onUploaded: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [instrument, setInstrument] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDone, setAiDone] = useState(false);
  const [adminEnsembles, setAdminEnsembles] = useState<AdminEnsemble[]>([]);
  const [shareProjectId, setShareProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("ensemble_members")
        .select("ensemble_id, role, ensembles:ensemble_id(id, name)")
        .eq("user_id", user.id)
        .eq("role", "admin");
      const list: AdminEnsemble[] = [];
      for (const m of (memberships ?? []) as { ensembles: { id: string; name: string } | null }[]) {
        const ens = m.ensembles;
        if (!ens) continue;
        try {
          const projects = await listProjects(ens.id);
          list.push({ id: ens.id, name: ens.name, projects });
        } catch { /* ignore */ }
      }
      setAdminEnsembles(list);
    })();
  }, []);

  // Extract first-page text (best effort) for the AI request
  const extractFirstPageText = async (f: File): Promise<string> => {
    try {
      const { getDocument } = await import("pdfjs-dist");
      const { ensurePdfWorker } = await import("@/lib/pdfWorker");
      ensurePdfWorker();
      const buf = await f.arrayBuffer();
      const pdf = await getDocument({ data: buf }).promise;
      const page = await pdf.getPage(1);
      const text = await page.getTextContent();
      return (text.items as { str?: string }[])
        .map((it) => it.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 2000);
    } catch {
      return "";
    }
  };

  const runAiClassification = async (f: File) => {
    setAiBusy(true); setAiError(null); setAiDone(false);
    try {
      const snippet = await extractFirstPageText(f);
      const { data, error } = await supabase.functions.invoke("classify-score", {
        body: { filename: f.name, textSnippet: snippet },
      });
      if (error) throw error;
      const r = data as {
        title?: string; composer?: string; instrument?: string;
        tags?: string[]; confidence?: string;
      };
      if (r.title && !title) setTitle(r.title);
      if (r.composer && !composer) setComposer(r.composer);
      if (r.instrument && !instrument) setInstrument(r.instrument);
      if (Array.isArray(r.tags)) {
        setAiTags(r.tags);
        if (r.tags[0] && !category && !newCategory) setCategory(r.tags[0]);
      }
      setAiDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI-förslag misslyckades";
      setAiError(msg.includes("402") ? "AI-krediter slut." :
                 msg.includes("429") ? "För många AI-anrop. Försök igen om en stund." : msg);
    } finally {
      setAiBusy(false);
    }
  };

  const onFile = (f: File | null) => {
    setFile(f);
    setAiDone(false);
    setAiTags([]);
    setAiError(null);
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const onSubmit = async () => {
    if (!file) { setErr("Välj en PDF"); return; }
    if (!title.trim()) { setErr("Titel krävs"); return; }
    const finalCategory = (newCategory.trim() || category).trim();
    setBusy(true); setErr(null);
    try {
      const created = await uploadScore({
        file,
        title: title.trim(),
        composer: composer.trim() || undefined,
        instrument: instrument.trim() || undefined,
        tags: finalCategory ? [finalCategory] : aiTags,
      });

      if (shareProjectId) {
        const ens = adminEnsembles.find((e) => e.projects.some((p) => p.id === shareProjectId));
        if (!ens) throw new Error("Projektet hittades inte");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Inte inloggad");
        const { data: isAdmin, error: adminErr } = await supabase.rpc("is_ensemble_admin", { _ensemble: ens.id, _user: user.id });
        if (adminErr) throw adminErr;
        if (!isAdmin) throw new Error("Du måste vara admin för att dela till projektet");
        const { error: shareErr } = await supabase.from("score_ensembles").insert({
          score_id: created.id, ensemble_id: ens.id, shared_by: user.id,
        });
        if (shareErr) throw shareErr;
        const { error: psErr } = await supabase.from("project_scores").insert({
          project_id: shareProjectId, title: created.title,
          composer: created.composer || null, score_id: created.id, created_by: user.id,
        });
        if (psErr) throw psErr;
      }
      onUploaded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Uppladdning misslyckades");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[20px] font-semibold tracking-tight">Lägg till noter</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center spring-tap">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-foreground/30 transition mb-3"
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-[14px]">{file ? file.name : "Tryck för att välja PDF"}</p>
          {file && <p className="text-[11px] text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />

        {/* AI CTA */}
        {file && (
          <button
            onClick={() => runAiClassification(file)}
            disabled={aiBusy}
            className="w-full mb-4 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-foreground/5 hover:bg-foreground/10 text-[13.5px] text-foreground transition disabled:opacity-60"
          >
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiBusy ? "Analyserar noten…" : aiDone ? "Analysera igen" : "Förslå kategori med AI"}
          </button>
        )}
        {aiError && <p className="text-[12px] text-destructive -mt-2 mb-3">{aiError}</p>}

        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]" />
          <input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Kompositör (valfritt)" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]" />
          <input value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="Instrument (valfritt)" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]" />
        </div>

        <div className="mt-5">
          <p className="text-[12.5px] font-medium text-muted-foreground mb-2">Mapp / kategori</p>
          {(aiTags.length > 0 || existingCategories.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.from(new Set([...aiTags, ...existingCategories])).map((c) => {
                const active = category === c && !newCategory.trim();
                const isAi = aiTags.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategory(active ? "" : c); setNewCategory(""); }}
                    className={`h-8 px-3 rounded-full text-[13px] border transition-colors inline-flex items-center gap-1 ${
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {isAi && <Sparkles className="h-3 w-3" />}
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          <input
            value={newCategory}
            onChange={(e) => { setNewCategory(e.target.value); if (e.target.value) setCategory(""); }}
            placeholder="eller ny kategori"
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]"
          />
        </div>

        {adminEnsembles.length > 0 && (
          <div className="mt-5">
            <p className="text-[12.5px] font-medium text-muted-foreground mb-2">
              Dela till ensemble-projekt (valfritt)
            </p>
            <select
              value={shareProjectId}
              onChange={(e) => setShareProjectId(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]"
            >
              <option value="">Dela inte</option>
              {adminEnsembles.map((ens) => (
                <optgroup key={ens.id} label={ens.name}>
                  {ens.projects.length === 0 ? (
                    <option disabled value="">Inga projekt</option>
                  ) : (
                    ens.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {err && <p className="text-xs text-destructive mt-3">{err}</p>}

        <button
          onClick={onSubmit}
          disabled={busy}
          className="mt-6 w-full bg-foreground text-background rounded-full py-3 disabled:opacity-50 text-[14px] font-medium spring-tap"
        >
          {busy ? "Lägger till…" : "Lägg till i biblioteket"}
        </button>
      </div>
    </div>
  );
};
