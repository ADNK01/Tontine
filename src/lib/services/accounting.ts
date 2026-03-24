import { createClient } from "@/lib/supabase/client";
import type { AccountingEntry, ChartOfAccount } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getChartOfAccounts(): Promise<ChartOfAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("code", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAccountingEntries(): Promise<AccountingEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounting_entries")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAccountingEntry(entry: {
  date: string;
  description: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  currency?: string;
  source_type?: string;
  source_id?: string;
}): Promise<AccountingEntry> {
  const supabase = createClient();
  const refNumber = `JE-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("accounting_entries")
    .insert({
      ...entry,
      organization_id: ORG_ID,
      reference_number: refNumber,
      currency: entry.currency || "RWF",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccountingEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounting_entries").delete().eq("id", id);
  if (error) throw error;
}
