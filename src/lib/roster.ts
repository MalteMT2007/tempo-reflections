import { supabase } from "@/integrations/supabase/client";

export type RosterEntry = {
  id: string;
  ensemble_id: string;
  name: string;
  instrument: string | null;
  section_id: string | null;
  claimed_by: string | null;
  created_by: string;
  created_at: string;
};

export async function listRoster(ensembleId: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from("ensemble_roster")
    .select("*")
    .eq("ensemble_id", ensembleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RosterEntry[];
}

/**
 * Quick-add: parses "Name - Instrument" or accepts both fields explicitly.
 */
export function parseQuickAdd(line: string): { name: string; instrument: string | null } {
  const idx = line.search(/\s[-–—]\s/);
  if (idx === -1) return { name: line.trim(), instrument: null };
  return {
    name: line.slice(0, idx).trim(),
    instrument: line.slice(idx + 3).trim() || null,
  };
}

export async function addRosterEntry(input: {
  ensembleId: string;
  name: string;
  instrument?: string | null;
  sectionId?: string | null;
}): Promise<RosterEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("ensemble_roster")
    .insert({
      ensemble_id: input.ensembleId,
      name: input.name,
      instrument: input.instrument ?? null,
      section_id: input.sectionId ?? null,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RosterEntry;
}

export async function removeRosterEntry(id: string) {
  const { error } = await supabase.from("ensemble_roster").delete().eq("id", id);
  if (error) throw error;
}
