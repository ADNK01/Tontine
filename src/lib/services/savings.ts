import { createClient } from "@/lib/supabase/client";
import type { SavingsAccount, SavingsTransaction } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_accounts")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSavingsAccount(
  id: string
): Promise<SavingsAccount | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createSavingsAccount(account: {
  member_id: string;
  currency?: string;
  interest_rate?: number;
}): Promise<SavingsAccount> {
  const supabase = createClient();
  const accountNumber = `SAV-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("savings_accounts")
    .insert({
      ...account,
      organization_id: ORG_ID,
      account_number: accountNumber,
      balance: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTransactions(
  accountId: string
): Promise<SavingsTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createDeposit(deposit: {
  account_id: string;
  amount: number;
  currency?: string;
  description?: string;
}): Promise<SavingsTransaction> {
  const supabase = createClient();

  // Get current balance
  const { data: account } = await supabase
    .from("savings_accounts")
    .select("balance")
    .eq("id", deposit.account_id)
    .single();

  const currentBalance = account?.balance || 0;
  const newBalance = currentBalance + deposit.amount;

  // Insert transaction
  const { data, error } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: deposit.account_id,
      type: "deposit",
      amount: deposit.amount,
      currency: deposit.currency || "RWF",
      balance_after: newBalance,
      description: deposit.description,
    })
    .select()
    .single();
  if (error) throw error;

  // Update account balance
  await supabase
    .from("savings_accounts")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deposit.account_id);

  return data;
}

export async function createWithdrawal(withdrawal: {
  account_id: string;
  amount: number;
  currency?: string;
  description?: string;
}): Promise<SavingsTransaction> {
  const supabase = createClient();

  // Get current balance
  const { data: account } = await supabase
    .from("savings_accounts")
    .select("balance")
    .eq("id", withdrawal.account_id)
    .single();

  const currentBalance = account?.balance || 0;
  if (withdrawal.amount > currentBalance) {
    throw new Error("Insufficient balance");
  }
  const newBalance = currentBalance - withdrawal.amount;

  // Insert transaction
  const { data, error } = await supabase
    .from("savings_transactions")
    .insert({
      account_id: withdrawal.account_id,
      type: "withdrawal",
      amount: withdrawal.amount,
      currency: withdrawal.currency || "RWF",
      balance_after: newBalance,
      description: withdrawal.description,
    })
    .select()
    .single();
  if (error) throw error;

  // Update account balance
  await supabase
    .from("savings_accounts")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", withdrawal.account_id);

  return data;
}
