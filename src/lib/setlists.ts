import { supabase } from "@/integrations/supabase/client";

export type Setlist = {
  id: string;
  owner_id: string;
  name: string;
  occasion_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SetlistWithCount = Setlist & { score_count: number };

export async function listMySetlists(): Promise<SetlistWithCount[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: sets, error } = await supabase
    .from("score_setlists")
    .select("*")
    .eq("owner_id", user.id)
    .order("occasion_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const list = (sets ?? []) as Setlist[];
  if (list.length === 0) return [];
  const { data: items } = await supabase
    .from("setlist_scores")
    .select("setlist_id")
    .in("setlist_id", list.map((s) => s.id));
  const counts = new Map<string, number>();
  for (const r of (items ?? []) as { setlist_id: string }[]) {
    counts.set(r.setlist_id, (counts.get(r.setlist_id) ?? 0) + 1);
  }
  return list.map((s) => ({ ...s, score_count: counts.get(s.id) ?? 0 }));
}

export async function createSetlist(input: { name: string; occasion_date?: string | null; notes?: string | null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("score_setlists")
    .insert({
      owner_id: user.id,
      name: input.name,
      occasion_date: input.occasion_date ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Setlist;
}

export async function deleteSetlist(id: string) {
  const { error } = await supabase.from("score_setlists").delete().eq("id", id);
  if (error) throw error;
}

export async function listSetlistScoreIds(setlistId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("setlist_scores")
    .select("score_id, sort_order")
    .eq("setlist_id", setlistId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { score_id: string }) => r.score_id);
}

export async function addScoreToSetlist(setlistId: string, scoreId: string) {
  const { error } = await supabase
    .from("setlist_scores")
    .insert({ setlist_id: setlistId, score_id: scoreId });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
}

export async function removeScoreFromSetlist(setlistId: string, scoreId: string) {
  const { error } = await supabase
    .from("setlist_scores")
    .delete()
    .eq("setlist_id", setlistId)
    .eq("score_id", scoreId);
  if (error) throw error;
}
