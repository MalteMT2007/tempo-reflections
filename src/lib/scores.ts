import { supabase } from "@/integrations/supabase/client";

export type Score = {
  id: string;
  owner_id: string;
  title: string;
  composer: string | null;
  instrument: string | null;
  tags: string[];
  file_path: string;
  page_count: number;
  size_bytes: number;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type AnnotationKind = "stroke" | "text";

export type StrokeData = {
  // normalized 0..1 coords relative to page render box
  points: { x: number; y: number }[];
  color: string;
  width: number; // px at 1x
};

export type TextData = {
  x: number; // normalized
  y: number; // normalized
  text: string;
  color: string;
  size: number; // px at 1x
};

export type Annotation = {
  id: string;
  score_id: string;
  user_id: string;
  page_index: number;
  kind: AnnotationKind;
  data: StrokeData | TextData;
  role: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------- Scores ----------------

export async function listMyScores(): Promise<Score[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .order("favorite", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Score[];
}

export async function setScoreFavorite(id: string, favorite: boolean) {
  const { error } = await supabase
    .from("scores")
    .update({ favorite })
    .eq("id", id);
  if (error) throw error;
}

export async function getScore(id: string): Promise<Score | null> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Score) ?? null;
}

export async function uploadScore(input: {
  file: File;
  title: string;
  composer?: string;
  instrument?: string;
  tags?: string[];
}): Promise<Score> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not signed in");

  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("scores")
    .upload(path, input.file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("scores")
    .insert({
      id,
      owner_id: user.id,
      title: input.title,
      composer: input.composer || null,
      instrument: input.instrument || null,
      tags: input.tags ?? [],
      file_path: path,
      size_bytes: input.file.size,
      page_count: 0,
    })
    .select()
    .single();
  if (error) {
    // best-effort cleanup
    await supabase.storage.from("scores").remove([path]);
    throw error;
  }
  return data as Score;
}

export async function updateScorePageCount(id: string, pageCount: number) {
  await supabase.from("scores").update({ page_count: pageCount }).eq("id", id);
}

export async function deleteScore(score: Score) {
  await supabase.storage.from("scores").remove([score.file_path]);
  const { error } = await supabase.from("scores").delete().eq("id", score.id);
  if (error) throw error;
}

export async function getScoreFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("scores")
    .createSignedUrl(filePath, 60 * 60); // 1h
  if (error) throw error;
  return data.signedUrl;
}

// ---------------- Annotations ----------------

export async function listAnnotations(scoreId: string): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("score_annotations")
    .select("*")
    .eq("score_id", scoreId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Annotation[];
}

export async function createAnnotation(input: {
  score_id: string;
  page_index: number;
  kind: AnnotationKind;
  data: StrokeData | TextData;
  session_id?: string | null;
}): Promise<Annotation> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("score_annotations")
    .insert({
      score_id: input.score_id,
      page_index: input.page_index,
      kind: input.kind,
      data: input.data as any,
      user_id: user.id,
      session_id: input.session_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Annotation;
}

export async function deleteAnnotation(id: string) {
  const { error } = await supabase.from("score_annotations").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Session linking ----------------

export async function listSessionScores(sessionId: string) {
  const { data, error } = await supabase
    .from("session_scores")
    .select("score_id, scores(*)")
    .eq("session_id", sessionId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.scores as Score);
}

export async function attachScoreToSession(sessionId: string, scoreId: string) {
  const { error } = await supabase
    .from("session_scores")
    .insert({ session_id: sessionId, score_id: scoreId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function listSessionsForScore(scoreId: string) {
  const { data, error } = await supabase
    .from("session_scores")
    .select("session_id, attached_at, practice_sessions(*)")
    .eq("score_id", scoreId)
    .order("attached_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
