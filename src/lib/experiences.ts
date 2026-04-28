import { supabase } from "@/integrations/supabase/client";

export type ExperienceKind = "experience" | "education" | "achievement";

export type Experience = {
  id: string;
  user_id: string;
  kind: ExperienceKind;
  title: string;
  organization: string | null;
  location: string | null;
  start_year: number | null;
  end_year: number | null;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export async function listExperiences(userId: string): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("profile_experiences")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("start_year", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Experience[];
}

export async function createExperience(input: Omit<Experience, "id" | "user_id" | "created_at" | "sort_order"> & { sort_order?: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("profile_experiences")
    .insert({ ...input, user_id: user.id, sort_order: input.sort_order ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Experience;
}

export async function updateExperience(id: string, patch: Partial<Omit<Experience, "id" | "user_id" | "created_at">>) {
  const { error } = await supabase.from("profile_experiences").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteExperience(id: string) {
  const { error } = await supabase.from("profile_experiences").delete().eq("id", id);
  if (error) throw error;
}
