import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createMember(member: {
  first_name: string;
  last_name: string;
  national_id?: string;
  phone: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  status?: string;
}): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .insert({ ...member, organization_id: ORG_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMember(
  id: string,
  updates: Partial<Member>
): Promise<Member> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMember(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}
