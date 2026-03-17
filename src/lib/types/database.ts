export type UserRole = "admin" | "manager" | "teller" | "member";
export type MemberStatus = "active" | "inactive" | "suspended";
export type LoanStatus = "pending" | "approved" | "disbursed" | "active" | "completed" | "defaulted" | "rejected";
export type InterestMethod = "flat" | "reducing_balance";
export type TransactionType = "deposit" | "withdrawal";
export type AccountType = "asset" | "liability" | "income" | "expense" | "equity";

export interface Organization {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  default_currency: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Member {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  national_id?: string;
  phone: string;
  email?: string;
  address?: string;
  status: MemberStatus;
  photo_url?: string;
  date_of_birth?: string;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  organization_id: string;
  member_id: string;
  member?: Member;
  loan_number: string;
  amount: number;
  currency: string;
  interest_rate: number;
  interest_method: InterestMethod;
  term_months: number;
  status: LoanStatus;
  purpose?: string;
  disbursement_date?: string;
  maturity_date?: string;
  approved_by?: string;
  approved_at?: string;
  total_repaid: number;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  amount: number;
  principal: number;
  interest: number;
  penalty: number;
  currency: string;
  payment_date: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface SavingsAccount {
  id: string;
  organization_id: string;
  member_id: string;
  member?: Member;
  account_number: string;
  balance: number;
  currency: string;
  interest_rate: number;
  status: "active" | "frozen" | "closed";
  created_at: string;
  updated_at: string;
}

export interface SavingsTransaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  balance_after: number;
  description?: string;
  recorded_by?: string;
  created_at: string;
}

export interface ChartOfAccount {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string;
  is_system: boolean;
  created_at: string;
}

export interface AccountingEntry {
  id: string;
  organization_id: string;
  date: string;
  reference_number: string;
  description: string;
  debit_account_id: string;
  credit_account_id: string;
  debit_account?: ChartOfAccount;
  credit_account?: ChartOfAccount;
  amount: number;
  currency: string;
  source_type?: string;
  source_id?: string;
  recorded_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

export interface OrgSettings {
  id: string;
  organization_id: string;
  default_interest_rate: number;
  default_interest_method: InterestMethod;
  default_loan_term: number;
  penalty_rate: number;
  savings_interest_rate: number;
  fiscal_year_start: number;
}

export interface RepaymentScheduleItem {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
