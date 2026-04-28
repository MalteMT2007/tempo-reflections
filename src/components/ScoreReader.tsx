import { useEffect, useMemo, useRef, useState } from "react";
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import {
  X,
  Pencil,
  Type as TypeIcon,
  Eraser,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Hand,
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

type Tool = "pan" | "draw" | "text" | "erase";

const COLORS = ["#1a1a1a", "#c44a2c", "#2c6cc4", "#2c8c5a", "#c49b2c"];
const WIDTHS = [2, 4, 7];

type Props = {
  score: Score;
  sessionId?: string | null;
  onClose: () => void;
};

// stable color from user_id
const userColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const palette = ["#c44a2c", "#2c6cc4", "#2c8c5a", "#c49b2c", "#7a3cc4", "#c43c8a"];
  return palette[h % palette.length];
};

export const ScoreReader = ({ score, sessionId, onClose }: Props) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // PDF page
  const overlayRef = useRef<HTMLCanvasElement>(null); // existing annotations rendered
  const drawRef = useRef<HTMLCanvasElement>(null); // active stroke
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1);
  const [renderSize, setRenderSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [showOthers, setShowOthers] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]); // annotation ids (own) to allow undo
  const [redoStack, setRedoStack] = useState<Annotation[]>([]); // re-creatable
  const [toolbarOpen, setToolbarOpen] = useState(true);

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

  // Load annotations
  useEffect(() => {
    listAnnotations(score.id).then(setAnnotations).catch(() => {});
  }, [score.id]);

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
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = (containerW - 32) / baseViewport.width;
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

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { renderTaskRef.current?.cancel?.(); } catch {}
      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      try { await renderTaskRef.current.promise; } catch { /* render canceled */ }
    })();
    return () => { cancelled = true; };
  }, [pageIndex, scale, pageCount]);

  // Re-draw overlay whenever annotations / page / size / visibility change
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
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

  // Pointer handlers for non-draw tools (text/erase). Draw uses DrawingCanvas.
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
      const target = [...annotations].reverse().find((a) => {
        if (a.page_index !== pageIndex) return false;
        if (a.user_id !== user?.id) return false;
        if (a.kind === "stroke") {
          const d = a.data as StrokeData;
          return d.points.some((p) => {
            const dx = p.x * renderSize.w - px;
            const dy = p.y * renderSize.h - py;
            return dx * dx + dy * dy < (d.width + 8) * (d.width + 8);
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
    // Convert filtered (px) points to normalized 0..1 for storage.
    const pts = s.points.map((p) => ({ x: p.x / renderSize.w, y: p.y / renderSize.h }));
    // Average engine width * scale -> stored width.
    const avgW =
      s.segments.reduce((a, seg) => a + seg.width, 0) / Math.max(1, s.segments.length);
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

  // Keyboard shortcuts
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

  const presence = useMemo(() => {
    const set = new Map<string, string>();
    annotations.forEach((a) => set.set(a.user_id, userColor(a.user_id)));
    return Array.from(set.entries());
  }, [annotations]);

  return (
    <div className="fixed inset-0 z-50 bg-background paper-grain flex flex-col animate-fade-in">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/70 backdrop-blur">
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:border-ink/40"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-ink" />
        </button>
        <div className="text-center min-w-0 px-3">
          <p className="font-serif text-sm text-ink truncate">{score.title}</p>
          {score.composer && <p className="font-serif italic text-[11px] text-ink-soft truncate">{score.composer}</p>}
        </div>
        <div className="flex items-center gap-2">
          {presence.slice(0, 3).map(([id, c]) => (
            <span
              key={id}
              className="h-6 w-6 rounded-full border border-paper text-[10px] font-medium flex items-center justify-center text-paper"
              style={{ background: c }}
              title={id === user?.id ? "You" : "Collaborator"}
            >
              {id === user?.id ? "Y" : "·"}
            </span>
          ))}
          <button
            onClick={() => setShowOthers((v) => !v)}
            className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:border-ink/40"
            aria-label="Toggle others' annotations"
            title={showOthers ? "Hide collaborators" : "Show collaborators"}
          >
            {showOthers ? <Eye className="h-4 w-4 text-ink" /> : <EyeOff className="h-4 w-4 text-ink-soft" />}
          </button>
        </div>
      </header>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center py-4 relative">
        <div className="relative shadow-elev bg-paper" style={{ width: renderSize.w || undefined, height: renderSize.h || undefined }}>
          <canvas ref={canvasRef} className="block" />
          <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
          {tool === "draw" ? (
            <DrawingCanvas
              width={renderSize.w}
              height={renderSize.h}
              color={color}
              widthScale={width / 4}
              onStrokeComplete={handleStrokeComplete}
              className="absolute inset-0"
            />
          ) : tool === "pan" ? null : (
            <div
              ref={drawRef as unknown as React.RefObject<HTMLDivElement>}
              className="absolute inset-0"
              style={{
                touchAction: "none",
                cursor: tool === "text" ? "text" : "crosshair",
              }}
              onPointerDown={onAuxPointerDown}
            />
          )}
        </div>
      </div>

      {/* Page nav */}
      <div className="flex items-center justify-center gap-4 py-2 border-t border-border bg-card/60">
        <button onClick={goPrev} disabled={pageIndex === 0} className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30">
          <ChevronLeft className="h-4 w-4 text-ink" />
        </button>
        <span className="text-xs text-ink-soft tabular">
          {pageCount > 0 ? `${pageIndex + 1} / ${pageCount}` : "…"}
        </span>
        <button onClick={goNext} disabled={pageIndex >= pageCount - 1} className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30">
          <ChevronRight className="h-4 w-4 text-ink" />
        </button>
        <div className="w-px h-5 bg-border mx-2" />
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="text-xs text-ink-soft px-2">−</button>
        <span className="text-[11px] text-muted-foreground tabular">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.1))} className="text-xs text-ink-soft px-2">+</button>
      </div>

      {/* Toolbar (collapsible, floating bottom) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        {toolbarOpen ? (
          <div className="rounded-full bg-ink text-paper shadow-elev flex items-center gap-1 px-2 py-1.5 animate-fade-in">
            <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} label="Pan"><Hand className="h-4 w-4" /></ToolBtn>
            <ToolBtn active={tool === "draw"} onClick={() => setTool("draw")} label="Draw"><Pencil className="h-4 w-4" /></ToolBtn>
            <ToolBtn active={tool === "text"} onClick={() => setTool("text")} label="Text"><TypeIcon className="h-4 w-4" /></ToolBtn>
            <ToolBtn active={tool === "erase"} onClick={() => setTool("erase")} label="Erase"><Eraser className="h-4 w-4" /></ToolBtn>
            <div className="w-px h-5 bg-paper/20 mx-1" />
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border transition ${color === c ? "border-paper scale-110" : "border-paper/30"}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
            <div className="w-px h-5 bg-paper/20 mx-1" />
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`h-7 w-7 rounded-full flex items-center justify-center transition ${width === w ? "bg-paper/20" : ""}`}
                aria-label={`Width ${w}`}
              >
                <span className="rounded-full bg-paper" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
            <div className="w-px h-5 bg-paper/20 mx-1" />
            <ToolBtn onClick={undo} label="Undo" disabled={undoStack.length === 0}><Undo2 className="h-4 w-4" /></ToolBtn>
            <ToolBtn onClick={redo} label="Redo" disabled={redoStack.length === 0}><Redo2 className="h-4 w-4" /></ToolBtn>
            <button
              onClick={() => setToolbarOpen(false)}
              className="ml-1 h-7 w-7 rounded-full hover:bg-paper/10 flex items-center justify-center"
              aria-label="Hide toolbar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setToolbarOpen(true)}
            className="rounded-full bg-ink text-paper px-4 py-2 shadow-elev text-xs uppercase tracking-wider"
          >
            Tools
          </button>
        )}
      </div>
    </div>
  );
};

const ToolBtn = ({
  active,
  onClick,
  label,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`h-8 w-8 rounded-full flex items-center justify-center transition ${
      active ? "bg-paper text-ink" : "hover:bg-paper/10"
    } disabled:opacity-30 disabled:hover:bg-transparent`}
  >
    {children}
  </button>
);
