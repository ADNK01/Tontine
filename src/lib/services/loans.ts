import { createClient } from "@/lib/supabase/client";
import type { Loan, LoanRepayment } from "@/lib/types/database";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function getLoans(): Promise<Loan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLoan(id: string): Promise<Loan | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createLoan(loan: {
  member_id: string;
  amount: number;
  currency?: string;
  interest_rate: number;
  interest_method?: string;
  term_months: number;
  purpose?: string;
}): Promise<Loan> {
  const supabase = createClient();
  const loanNumber = `LN-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from("loans")
    .insert({
      ...loan,
      organization_id: ORG_ID,
      loan_number: loanNumber,
      outstanding_balance: loan.amount,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLoanStatus(
  id: string,
  status: string
): Promise<Loan> {
  const supabase = createClient();
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "disbursed" || status === "active") {
    updates.disbursement_date = new Date().toISOString().split("T")[0];
  }
  const { data, error } = await supabase
    .from("loans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRepayments(loanId: string): Promise<LoanRepayment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loan_repayments")
    .select("*")
    .eq("loan_id", loanId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRepayment(repayment: {
  loan_id: string;
  amount: number;
  principal: number;
  interest: number;
  penalty?: number;
  currency?: string;
  payment_date?: string;
  notes?: string;
}): Promise<LoanRepayment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("loan_repayments")
    .insert(repayment)
    .select()
    .single();
  if (error) throw error;

  // Update loan outstanding balance
  await supabase.rpc("", {}).catch(() => {});
  const { data: loan } = await supabase
    .from("loans")
    .select("outstanding_balance, total_repaid")
    .eq("id", repayment.loan_id)
    .single();
  if (loan) {
    await supabase
      .from("loans")
      .update({
        outstanding_balance: loan.outstanding_balance - repayment.amount,
        total_repaid: loan.total_repaid + repayment.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", repayment.loan_id);
  }

  return data;
}
