import { createClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getAuditLogs(): Promise<AuditLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function createAuditLog(log: {
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("audit_logs").insert({
    ...log,
    organization_id: ORG_ID,
  });
}
