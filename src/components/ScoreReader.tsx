import { useEffect, useMemo, useRef, useState } from "react";
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import {
  Music2,
  BookOpen,
  Menu,
  Cloud,
  LayoutGrid,
  ChevronDown,
  PenLine,
  Search,
  Triangle,
  Briefcase,
  X,
  Pencil,
  Type as TypeIcon,
  Eraser,
  Undo2,
  Redo2,
} from "lucide-react";
import { ensurePdfWorker } from "@/lib/pdfWorker";
import {
  Annotation,
  StrokeData,
  TextData,
  createAnnotation,
  deleteAnnotation,
  getScoreFileUrl,
  listAnnotations,
  updateScorePageCount,
  type Score,
} from "@/lib/scores";
import { useAuth } from "@/contexts/AuthContext";
import { DrawingCanvas, type CompletedStroke } from "@/components/drawing/DrawingCanvas";
import { supabase } from "@/integrations/supabase/client";
import { useScorePresence, type PresenceUser } from "@/hooks/useScorePresence";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import { useDraggableSnap, dockStyle, isVerticalEdge } from "@/hooks/useDraggableSnap";
import { GripVertical } from "lucide-react";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { WarmScreen } from "@/components/reader/WarmScreen";
import { EraserToolButton, type EraseMode } from "@/components/reader/EraserPopover";

type Tool = "pan" | "draw" | "text" | "erase";

const COLORS = ["#1a1a1a", "#c44a2c", "#2c6cc4", "#2c8c5a", "#c49b2c"];
const WIDTHS = [2, 4, 7];

type Props = {
  score: Score;
  sessionId?: string | null;
  onClose: () => void;
};

const userColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const palette = ["#c44a2c", "#2c6cc4", "#2c8c5a", "#c49b2c", "#7a3cc4", "#c43c8a"];
  return palette[h % palette.length];
};

export const ScoreReader = ({ score, sessionId, onClose }: Props) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1);
  const [renderSize, setRenderSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>("pan");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [showOthers, setShowOthers] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);

  // Eraser modes (image_0 reference)
  const [eraseMode, setEraseMode] = useState<EraseMode>("standard");

  // Reader sheet (image_1 reference) — opens on double-tap
  const [sheetOpen, setSheetOpen] = useState(false);
  const [halfPage, setHalfPage] = useState(false);
  // 0 = top half, 1 = bottom half (only relevant when halfPage)
  const [halfIdx, setHalfIdx] = useState<0 | 1>(0);
  const [warmScreen, setWarmScreen] = useState<boolean>(() => {
    try { return localStorage.getItem("reader:warm-screen") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("reader:warm-screen", warmScreen ? "1" : "0"); } catch {}
  }, [warmScreen]);

  // ForScore-style: chrome auto-shows; tap toggles. Annotate panel only when in draw/text/erase.
  const [chromeVisible, setChromeVisible] = useState(true);
  const [annotateOpen, setAnnotateOpen] = useState(false);

  // Track whether a page overlay (Library, Ensembles, etc.) is covering the
  // reader. While covered, the reader's own top/bottom toolbars must be hidden
  // so they only ever appear when the user is actually reading.
  const [overlayActive, setOverlayActive] = useState(
    typeof document !== "undefined" && document.body.hasAttribute("data-page-overlay")
  );
  useEffect(() => {
    const sync = () =>
      setOverlayActive(document.body.hasAttribute("data-page-overlay"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-page-overlay"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-reader-open", "true");
    window.dispatchEvent(new Event("reader-open-change"));
    return () => {
      document.body.removeAttribute("data-reader-open");
      window.dispatchEvent(new Event("reader-open-change"));
    };
  }, []);

  const showChrome = chromeVisible && !overlayActive;

  // Broadcast chrome visibility so dock/hamburger can mirror toolbar visibility.
  useEffect(() => {
    if (overlayActive) return;
    if (showChrome) {
      document.body.setAttribute("data-reader-chrome", "true");
    } else {
      document.body.removeAttribute("data-reader-chrome");
    }
    window.dispatchEvent(new Event("reader-chrome-change"));
    return () => {
      document.body.removeAttribute("data-reader-chrome");
      window.dispatchEvent(new Event("reader-chrome-change"));
    };
  }, [showChrome, overlayActive]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    ensurePdfWorker();
    (async () => {
      const url = await getScoreFileUrl(score.file_path);
      const loadingTask = getDocument({ url });
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setPageCount(pdf.numPages);
      if (pdf.numPages !== score.page_count) {
        updateScorePageCount(score.id, pdf.numPages).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
      pdfRef.current?.destroy().catch(() => {});
    };
  }, [score.id, score.file_path]);

  useEffect(() => {
    listAnnotations(score.id).then(setAnnotations).catch(() => {});
  }, [score.id]);

  // ---- Realtime: live annotations from collaborators ----
  useEffect(() => {
    const channel = supabase
      .channel(`score-annotations:${score.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "score_annotations", filter: `score_id=eq.${score.id}` },
        (payload) => {
          const ann = payload.new as Annotation;
          setAnnotations((prev) => (prev.some((a) => a.id === ann.id) ? prev : [...prev, ann]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "score_annotations", filter: `score_id=eq.${score.id}` },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (!oldId) return;
          setAnnotations((prev) => prev.filter((a) => a.id !== oldId));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "score_annotations", filter: `score_id=eq.${score.id}` },
        (payload) => {
          const ann = payload.new as Annotation;
          setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? ann : a)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [score.id]);

  // ---- Presence: who is viewing this score right now ----
  const [me, setMe] = useState<PresenceUser | null>(null);
  useEffect(() => {
    if (!user?.id) {
      setMe(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMe({
          user_id: user.id,
          username: data?.username ?? null,
          display_name: data?.display_name ?? null,
          avatar_url: data?.avatar_url ?? null,
          online_at: new Date().toISOString(),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  const presenceUsers = useScorePresence(score.id, me);

  const isScoreOwner = user?.id === score.owner_id;

  // Render the current page
  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      pageRef.current = page;
      const container = containerRef.current;
      const containerW = container?.clientWidth ?? 800;
      const containerH = container?.clientHeight ?? 800;
      const baseViewport = page.getViewport({ scale: 1 });
      // Fit page to container (height-priority for ForScore feel)
      const fitW = (containerW - 32) / baseViewport.width;
      const fitH = (containerH - 32) / baseViewport.height;
      const fitScale = Math.min(fitW, fitH);
      const finalScale = fitScale * scale;
      const viewport = page.getViewport({ scale: finalScale });
      const dpr = window.devicePixelRatio || 1;

      const setCanvasSize = (c: HTMLCanvasElement) => {
        c.width = Math.floor(viewport.width * dpr);
        c.height = Math.floor(viewport.height * dpr);
        c.style.width = `${Math.floor(viewport.width)}px`;
        c.style.height = `${Math.floor(viewport.height)}px`;
      };

      const canvas = canvasRef.current!;
      const overlay = overlayRef.current!;
      setCanvasSize(canvas);
      setCanvasSize(overlay);
      setRenderSize({ w: viewport.width, h: viewport.height });

      const ctx = canvas.getContext("2d", { desynchronized: true, alpha: false }) as CanvasRenderingContext2D;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { renderTaskRef.current?.cancel?.(); } catch {}
      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      try { await renderTaskRef.current.promise; } catch {}
    })();
    return () => { cancelled = true; };
  }, [pageIndex, scale, pageCount]);

  // Re-draw overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d", { desynchronized: true, alpha: true }) as CanvasRenderingContext2D;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, renderSize.w, renderSize.h);

    const visible = annotations.filter((a) => {
      if (a.page_index !== pageIndex) return false;
      if (a.user_id !== user?.id && !showOthers) return false;
      return true;
    });

    for (const a of visible) {
      const isMine = a.user_id === user?.id;
      const baseColor = isMine ? null : userColor(a.user_id);
      if (a.kind === "stroke") {
        const d = a.data as StrokeData;
        ctx.strokeStyle = baseColor ?? d.color;
        ctx.lineWidth = d.width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        d.points.forEach((p, i) => {
          const x = p.x * renderSize.w;
          const y = p.y * renderSize.h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else if (a.kind === "text") {
        const d = a.data as TextData;
        ctx.fillStyle = baseColor ?? d.color;
        ctx.font = `${d.size}px ui-serif, Georgia, serif`;
        ctx.textBaseline = "top";
        ctx.fillText(d.text, d.x * renderSize.w, d.y * renderSize.h);
      }
    }
  }, [annotations, pageIndex, renderSize, showOthers, user?.id]);

  const getRelative = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onAuxPointerDown = async (e: React.PointerEvent) => {
    if (tool === "pan" || tool === "draw") return;
    const rel = getRelative(e);

    if (tool === "text") {
      const txt = window.prompt("Add note");
      if (!txt) return;
      const data: TextData = { x: rel.x, y: rel.y, text: txt, color, size: 16 };
      const ann = await createAnnotation({
        score_id: score.id,
        page_index: pageIndex,
        kind: "text",
        data,
        session_id: sessionId ?? null,
      });
      setAnnotations((a) => [...a, ann]);
      setUndoStack((s) => [...s, ann.id]);
      setRedoStack([]);
    } else if (tool === "erase") {
      const px = rel.x * renderSize.w;
      const py = rel.y * renderSize.h;
      // Per-mode hit radius. Stroke mode = whole-stroke deletion (vector hit-test).
      const radius =
        eraseMode === "precision" ? 4 :
        eraseMode === "stroke"    ? 6 : 14;
      const target = [...annotations].reverse().find((a) => {
        if (a.page_index !== pageIndex) return false;
        if (a.user_id !== user?.id && !isScoreOwner) return false;
        if (a.kind === "stroke") {
          const d = a.data as StrokeData;
          // Stroke-mode: hit anywhere along the stroke deletes it.
          // Precision/Standard: same hit-test, just smaller radius.
          return d.points.some((p) => {
            const dx = p.x * renderSize.w - px;
            const dy = p.y * renderSize.h - py;
            const r = d.width + radius;
            return dx * dx + dy * dy < r * r;
          });
        } else {
          const d = a.data as TextData;
          const tx = d.x * renderSize.w;
          const ty = d.y * renderSize.h;
          return px >= tx - 4 && px <= tx + d.text.length * d.size * 0.6 && py >= ty - 4 && py <= ty + d.size + 4;
        }
      });
      if (target) {
        setAnnotations((a) => a.filter((x) => x.id !== target.id));
        deleteAnnotation(target.id).catch(() => {});
      }
    }
  };

  const handleStrokeComplete = async (s: CompletedStroke) => {
    if (s.points.length < 2 || renderSize.w === 0) return;
    const pts = s.points.map((p) => ({ x: p.x / renderSize.w, y: p.y / renderSize.h }));
    const avgW = s.segments.reduce((a, seg) => a + seg.width, 0) / Math.max(1, s.segments.length);
    const data: StrokeData = {
      points: pts,
      color: s.color,
      width: Math.max(1, avgW * (s.widthScale || 1)),
    };
    const ann = await createAnnotation({
      score_id: score.id,
      page_index: pageIndex,
      kind: "stroke",
      data,
      session_id: sessionId ?? null,
    });
    setAnnotations((a) => [...a, ann]);
    setUndoStack((st) => [...st, ann.id]);
    setRedoStack([]);
  };

  const undo = async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    const ann = annotations.find((a) => a.id === last);
    setUndoStack((s) => s.slice(0, -1));
    if (ann) setRedoStack((r) => [...r, ann]);
    setAnnotations((a) => a.filter((x) => x.id !== last));
    deleteAnnotation(last).catch(() => {});
  };

  const redo = async () => {
    const ann = redoStack[redoStack.length - 1];
    if (!ann) return;
    setRedoStack((r) => r.slice(0, -1));
    const created = await createAnnotation({
      score_id: ann.score_id,
      page_index: ann.page_index,
      kind: ann.kind,
      data: ann.data,
      session_id: ann.session_id ?? null,
    });
    setAnnotations((a) => [...a, created]);
    setUndoStack((s) => [...s, created.id]);
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  // Center tap toggles chrome; edge taps navigate (finger only — pencil draws)
  const handleZoneTap = (zone: "prev" | "center" | "next") => (e: React.PointerEvent) => {
    if (e.pointerType === "pen") return;
    if (tool === "draw" || tool === "text" || tool === "erase") return;
    e.preventDefault();
    if (zone === "prev") goPrev();
    else if (zone === "next") goNext();
    else setChromeVisible((v) => !v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
      else if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoStack, redoStack, annotations, pageCount]);

  const titleLabel = useMemo(() => {
    const composer = score.composer ? `${score.composer}` : "";
    const total = pageCount || score.page_count || 0;
    const pageText = total ? `, sid. ${pageIndex + 1} av ${total}` : "";
    return `${score.title}${composer ? ` – ${composer}` : ""}${pageText}`;
  }, [score.title, score.composer, score.page_count, pageIndex, pageCount]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in select-none">
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex items-center justify-center relative">
        <div
          className="relative shadow-elev bg-paper"
          style={{ width: renderSize.w || undefined, height: renderSize.h || undefined }}
        >
          <canvas ref={canvasRef} className="block" />
          <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />

          {/* Tap zones (finger only) */}
          <div
            className="absolute inset-y-0 left-0 w-1/4 z-10"
            style={{ touchAction: "manipulation" }}
            onPointerDown={handleZoneTap("prev")}
            aria-label="Previous page"
          />
          <div
            className="absolute inset-y-0 left-1/4 w-1/2 z-10"
            style={{ touchAction: "manipulation" }}
            onPointerDown={handleZoneTap("center")}
            aria-label="Toggle controls"
          />
          <div
            className="absolute inset-y-0 right-0 w-1/4 z-10"
            style={{ touchAction: "manipulation" }}
            onPointerDown={handleZoneTap("next")}
            aria-label="Next page"
          />

          {tool === "draw" ? (
            <DrawingCanvas
              width={renderSize.w}
              height={renderSize.h}
              color={color}
              widthScale={width / 4}
              acceptAll={false}
              onStrokeComplete={handleStrokeComplete}
              className="absolute inset-0 z-20"
            />
          ) : tool === "pan" ? null : (
            <div
              ref={drawRef as unknown as React.RefObject<HTMLDivElement>}
              className="absolute inset-0 z-20"
              style={{
                touchAction: "none",
                cursor: tool === "text" ? "text" : "crosshair",
              }}
              onPointerDown={onAuxPointerDown}
            />
          )}
        </div>
      </div>

      {/* === ForScore-style floating top toolbar (3 glass pills) === */}
      <div
        className={`pointer-events-none fixed top-0 inset-x-0 z-40 px-3 pt-3 transition-all duration-300 ${
          showChrome ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
        }`}
      >
        <div className="flex items-center justify-between gap-2 max-w-[1400px] mx-auto">
          {/* Left pill */}
          <GlassPill>
            <PillBtn label="Library" onClick={onClose}><Music2 className="h-[18px] w-[18px]" /></PillBtn>
            <PillBtn label="Bookmarks"><BookOpen className="h-[18px] w-[18px]" /></PillBtn>
            <PillBtn label="Menu"><Menu className="h-[18px] w-[18px]" /></PillBtn>
            <PillBtn label="Cloud"><Cloud className="h-[18px] w-[18px]" /></PillBtn>
          </GlassPill>

          {/* Center title pill */}
          <GlassPill className="flex-1 max-w-[640px] min-w-0">
            <PillBtn label="Pages"><LayoutGrid className="h-[18px] w-[18px]" /></PillBtn>
            <div className="flex-1 min-w-0 px-2 text-center">
              <p className="text-[13px] text-ink truncate">{titleLabel}</p>
            </div>
            <div className="px-1">
              <PresenceAvatars users={presenceUsers} meId={user?.id} />
            </div>
            <PillBtn label="More"><ChevronDown className="h-[18px] w-[18px]" /></PillBtn>
          </GlassPill>

          {/* Right pill */}
          <GlassPill>
            <PillBtn
              label="Annotate"
              active={annotateOpen}
              onClick={() => {
                const next = !annotateOpen;
                setAnnotateOpen(next);
                setTool(next ? "draw" : "pan");
              }}
            >
              <PenLine className="h-[18px] w-[18px]" />
            </PillBtn>
            <PillBtn label="Search"><Search className="h-[18px] w-[18px]" /></PillBtn>
            <PillBtn label="Metronome"><Triangle className="h-[18px] w-[18px]" /></PillBtn>
            <PillBtn label="Setlist"><Briefcase className="h-[18px] w-[18px]" /></PillBtn>
          </GlassPill>
        </div>
      </div>

      {/* Annotate sub-toolbar — draggable, snaps to nearest screen edge */}
      {annotateOpen && (
        <DraggableAnnotateToolbar
          visible={showChrome}
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          width={width}
          setWidth={setWidth}
          undo={undo}
          redo={redo}
          undoDisabled={undoStack.length === 0}
          redoDisabled={redoStack.length === 0}
          onClose={() => { setAnnotateOpen(false); setTool("pan"); }}
        />
      )}
    </div>
  );
};

// ---- Draggable snap-to-edge toolbar ----
function DraggableAnnotateToolbar({
  visible,
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  undo,
  redo,
  undoDisabled,
  redoDisabled,
  onClose,
}: {
  visible: boolean;
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  width: number;
  setWidth: (w: number) => void;
  undo: () => void;
  redo: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;
  onClose: () => void;
}) {
  const { pos, dragging, previewXY, bind } = useDraggableSnap("pen-toolbar-pos", { edge: "right", offset: 50 });
  const vertical = isVerticalEdge(pos.edge);

  const style: React.CSSProperties = dragging && previewXY
    ? { position: "fixed", left: previewXY.x, top: previewXY.y, transform: "translate(-50%, -50%)" }
    : dockStyle(pos, vertical);

  return (
    <>
      {/* Edge snap hint while dragging */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <div className="absolute inset-y-0 left-0 w-2 bg-primary/20" />
          <div className="absolute inset-y-0 right-0 w-2 bg-primary/20" />
          <div className="absolute inset-x-0 top-0 h-2 bg-primary/20" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-primary/20" />
        </div>
      )}
      <div
        {...bind}
        style={{ ...style, touchAction: "none", zIndex: 41 }}
        className={`transition-opacity duration-200 ${visible || dragging ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className={`pointer-events-auto flex ${vertical ? "flex-col" : "flex-row"} items-center gap-0.5 rounded-2xl ${vertical ? "px-1.5 py-2" : "px-2 py-1.5"} bg-background/70 backdrop-blur-xl border border-ink/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]`}
        >
          <button
            data-drag-handle
            className="pointer-events-auto h-7 w-7 rounded-md flex items-center justify-center text-ink/40 hover:text-ink/70 cursor-grab active:cursor-grabbing"
            aria-label="Drag toolbar"
            title="Drag to move"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className={`h-4 w-4 ${vertical ? "" : "rotate-90"}`} />
          </button>
          <ToolDivider vertical={vertical} />
          <PillBtn active={tool === "draw"} onClick={() => setTool("draw")} label="Draw"><Pencil className="h-[18px] w-[18px]" /></PillBtn>
          <PillBtn active={tool === "text"} onClick={() => setTool("text")} label="Text"><TypeIcon className="h-[18px] w-[18px]" /></PillBtn>
          <PillBtn active={tool === "erase"} onClick={() => setTool("erase")} label="Erase"><Eraser className="h-[18px] w-[18px]" /></PillBtn>
          <ToolDivider vertical={vertical} />
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`pointer-events-auto h-5 w-5 rounded-full border transition shrink-0 ${color === c ? "border-ink scale-110" : "border-ink/20"}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
          <ToolDivider vertical={vertical} />
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`pointer-events-auto h-7 w-7 rounded-full flex items-center justify-center transition shrink-0 ${width === w ? "bg-ink/10" : ""}`}
              aria-label={`Width ${w}`}
            >
              <span className="rounded-full bg-ink" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
          <ToolDivider vertical={vertical} />
          <PillBtn onClick={undo} label="Undo" disabled={undoDisabled}><Undo2 className="h-[18px] w-[18px]" /></PillBtn>
          <PillBtn onClick={redo} label="Redo" disabled={redoDisabled}><Redo2 className="h-[18px] w-[18px]" /></PillBtn>
          <PillBtn label="Done" onClick={onClose}><X className="h-[18px] w-[18px]" /></PillBtn>
        </div>
      </div>
    </>
  );
}

const ToolDivider = ({ vertical }: { vertical: boolean }) =>
  vertical ? <div className="h-px w-5 bg-ink/10 my-1" /> : <div className="w-px h-5 bg-ink/10 mx-1" />;

const GlassPill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`pointer-events-auto flex items-center gap-0.5 rounded-full px-2 py-1.5 bg-background/55 backdrop-blur-xl border border-ink/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] ${className}`}
  >
    {children}
  </div>
);

const Divider = () => <div className="w-px h-5 bg-ink/10 mx-1" />;

const PillBtn = ({
  active,
  onClick,
  label,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`pointer-events-auto h-9 w-9 rounded-full flex items-center justify-center transition shrink-0 ${
      active ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
    } disabled:opacity-30 disabled:hover:bg-transparent`}
  >
    {children}
  </button>
);
