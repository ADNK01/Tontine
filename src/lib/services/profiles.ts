import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateProfileRole(
  id: string,
  role: string
): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProfile(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}
