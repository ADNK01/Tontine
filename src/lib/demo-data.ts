import type {
  Member, Loan, LoanRepayment, SavingsAccount, SavingsTransaction,
  ChartOfAccount, AccountingEntry, AuditLog, Profile, Organization, OrgSettings, Currency
} from "@/lib/types/database";

export const demoOrg: Organization = {
  id: "org-1",
  name: "TSK Tontine",
  address: "KG 123 St, Kigali, Rwanda",
  phone: "+250 788 123 456",
  email: "info@tsk-tontine.rw",
  default_currency: "RWF",
  created_at: "2024-01-01T00:00:00Z",
};

export const demoProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  organization_id: "org-1",
  full_name: "Dr. TUYISHIMIRE Gratien",
  role: "admin",
  email: "gratien@tsk-tontine.rw",
  phone: "+250 788 000 001",
  created_at: "2024-01-01T00:00:00Z",
};

export const demoCurrencies: Currency[] = [
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", exchange_rate: 1, is_default: true },
  { code: "USD", name: "US Dollar", symbol: "$", exchange_rate: 1350, is_default: false },
  { code: "EUR", name: "Euro", symbol: "€", exchange_rate: 1480, is_default: false },
];

export const demoSettings: OrgSettings = {
  id: "settings-1",
  organization_id: "org-1",
  default_interest_rate: 18,
  default_interest_method: "flat",
  default_loan_term: 12,
  penalty_rate: 2,
  savings_interest_rate: 5,
  fiscal_year_start: 1,
};

export const demoMembers: Member[] = [
  {
    id: "m-1", organization_id: "org-1", first_name: "Jean", last_name: "MUTABAZI",
    national_id: "1199880012345678", phone: "+250 788 111 001", email: "jean@email.com",
    address: "KG 45 Ave, Kigali", status: "active", join_date: "2024-01-15",
    created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "m-2", organization_id: "org-1", first_name: "Marie", last_name: "UWIMANA",
    national_id: "1199580023456789", phone: "+250 788 111 002", email: "marie@email.com",
    address: "KN 78 St, Kigali", status: "active", join_date: "2024-01-20",
    created_at: "2024-01-20T00:00:00Z", updated_at: "2024-01-20T00:00:00Z",
  },
  {
    id: "m-3", organization_id: "org-1", first_name: "Patrick", last_name: "NIYONZIMA",
    national_id: "1198780034567890", phone: "+250 788 111 003", email: "patrick@email.com",
    address: "KK 12 Ave, Kigali", status: "active", join_date: "2024-02-01",
    created_at: "2024-02-01T00:00:00Z", updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "m-4", organization_id: "org-1", first_name: "Diane", last_name: "MUKAMANA",
    national_id: "1199080045678901", phone: "+250 788 111 004", email: "diane@email.com",
    address: "KG 90 St, Kigali", status: "active", join_date: "2024-02-10",
    created_at: "2024-02-10T00:00:00Z", updated_at: "2024-02-10T00:00:00Z",
  },
  {
    id: "m-5", organization_id: "org-1", first_name: "Emmanuel", last_name: "HABIMANA",
    national_id: "1199280056789012", phone: "+250 788 111 005",
    address: "KN 34 Ave, Kigali", status: "inactive", join_date: "2024-03-01",
    created_at: "2024-03-01T00:00:00Z", updated_at: "2024-06-15T00:00:00Z",
  },
  {
    id: "m-6", organization_id: "org-1", first_name: "Alice", last_name: "INGABIRE",
    national_id: "1199680067890123", phone: "+250 788 111 006", email: "alice@email.com",
    address: "KG 56 St, Kigali", status: "active", join_date: "2024-03-15",
    created_at: "2024-03-15T00:00:00Z", updated_at: "2024-03-15T00:00:00Z",
  },
];

export const demoLoans: Loan[] = [
  {
    id: "l-1", organization_id: "org-1", member_id: "m-1", loan_number: "LN-2024-001",
    amount: 500000, currency: "RWF", interest_rate: 18, interest_method: "flat",
    term_months: 12, status: "active", purpose: "Business expansion",
    disbursement_date: "2024-03-01", maturity_date: "2025-03-01",
    approved_by: "profile-1", approved_at: "2024-02-28T00:00:00Z",
    total_repaid: 250000, outstanding_balance: 340000,
    created_at: "2024-02-25T00:00:00Z", updated_at: "2024-09-01T00:00:00Z",
  },
  {
    id: "l-2", organization_id: "org-1", member_id: "m-2", loan_number: "LN-2024-002",
    amount: 300000, currency: "RWF", interest_rate: 15, interest_method: "reducing_balance",
    term_months: 6, status: "active", purpose: "Education fees",
    disbursement_date: "2024-06-01", maturity_date: "2024-12-01",
    approved_by: "profile-1", approved_at: "2024-05-30T00:00:00Z",
    total_repaid: 150000, outstanding_balance: 170000,
    created_at: "2024-05-28T00:00:00Z", updated_at: "2024-09-01T00:00:00Z",
  },
  {
    id: "l-3", organization_id: "org-1", member_id: "m-3", loan_number: "LN-2024-003",
    amount: 1000000, currency: "RWF", interest_rate: 20, interest_method: "flat",
    term_months: 24, status: "pending", purpose: "Agriculture investment",
    total_repaid: 0, outstanding_balance: 1000000,
    created_at: "2024-09-01T00:00:00Z", updated_at: "2024-09-01T00:00:00Z",
  },
  {
    id: "l-4", organization_id: "org-1", member_id: "m-4", loan_number: "LN-2024-004",
    amount: 200000, currency: "RWF", interest_rate: 18, interest_method: "flat",
    term_months: 6, status: "completed", purpose: "Medical expenses",
    disbursement_date: "2024-01-15", maturity_date: "2024-07-15",
    approved_by: "profile-1", approved_at: "2024-01-14T00:00:00Z",
    total_repaid: 218000, outstanding_balance: 0,
    created_at: "2024-01-12T00:00:00Z", updated_at: "2024-07-15T00:00:00Z",
  },
];

export const demoRepayments: LoanRepayment[] = [
  { id: "r-1", loan_id: "l-1", amount: 49167, principal: 41667, interest: 7500, penalty: 0, currency: "RWF", payment_date: "2024-04-01", created_at: "2024-04-01T00:00:00Z" },
  { id: "r-2", loan_id: "l-1", amount: 49167, principal: 41667, interest: 7500, penalty: 0, currency: "RWF", payment_date: "2024-05-01", created_at: "2024-05-01T00:00:00Z" },
  { id: "r-3", loan_id: "l-1", amount: 49167, principal: 41667, interest: 7500, penalty: 0, currency: "RWF", payment_date: "2024-06-01", created_at: "2024-06-01T00:00:00Z" },
  { id: "r-4", loan_id: "l-1", amount: 49167, principal: 41667, interest: 7500, penalty: 0, currency: "RWF", payment_date: "2024-07-01", created_at: "2024-07-01T00:00:00Z" },
  { id: "r-5", loan_id: "l-1", amount: 53332, principal: 41665, interest: 7500, penalty: 4167, currency: "RWF", payment_date: "2024-08-05", created_at: "2024-08-05T00:00:00Z" },
  { id: "r-6", loan_id: "l-2", amount: 52500, principal: 50000, interest: 2500, penalty: 0, currency: "RWF", payment_date: "2024-07-01", created_at: "2024-07-01T00:00:00Z" },
  { id: "r-7", loan_id: "l-2", amount: 51875, principal: 50625, interest: 1250, penalty: 0, currency: "RWF", payment_date: "2024-08-01", created_at: "2024-08-01T00:00:00Z" },
  { id: "r-8", loan_id: "l-2", amount: 45625, principal: 45000, interest: 625, penalty: 0, currency: "RWF", payment_date: "2024-09-01", created_at: "2024-09-01T00:00:00Z" },
];

export const demoSavingsAccounts: SavingsAccount[] = [
  { id: "sa-1", organization_id: "org-1", member_id: "m-1", account_number: "SAV-001", balance: 150000, currency: "RWF", interest_rate: 5, status: "active", created_at: "2024-01-15T00:00:00Z", updated_at: "2024-09-01T00:00:00Z" },
  { id: "sa-2", organization_id: "org-1", member_id: "m-2", account_number: "SAV-002", balance: 280000, currency: "RWF", interest_rate: 5, status: "active", created_at: "2024-01-20T00:00:00Z", updated_at: "2024-09-01T00:00:00Z" },
  { id: "sa-3", organization_id: "org-1", member_id: "m-3", account_number: "SAV-003", balance: 75000, currency: "RWF", interest_rate: 5, status: "active", created_at: "2024-02-01T00:00:00Z", updated_at: "2024-09-01T00:00:00Z" },
  { id: "sa-4", organization_id: "org-1", member_id: "m-4", account_number: "SAV-004", balance: 420000, currency: "RWF", interest_rate: 5, status: "active", created_at: "2024-02-10T00:00:00Z", updated_at: "2024-09-01T00:00:00Z" },
  { id: "sa-5", organization_id: "org-1", member_id: "m-6", account_number: "SAV-006", balance: 95000, currency: "RWF", interest_rate: 5, status: "active", created_at: "2024-03-15T00:00:00Z", updated_at: "2024-09-01T00:00:00Z" },
];

export const demoSavingsTransactions: SavingsTransaction[] = [
  { id: "st-1", account_id: "sa-1", type: "deposit", amount: 50000, currency: "RWF", balance_after: 50000, description: "Initial deposit", created_at: "2024-01-15T00:00:00Z" },
  { id: "st-2", account_id: "sa-1", type: "deposit", amount: 50000, currency: "RWF", balance_after: 100000, description: "Monthly saving", created_at: "2024-02-15T00:00:00Z" },
  { id: "st-3", account_id: "sa-1", type: "deposit", amount: 75000, currency: "RWF", balance_after: 175000, description: "Monthly saving", created_at: "2024-03-15T00:00:00Z" },
  { id: "st-4", account_id: "sa-1", type: "withdrawal", amount: 25000, currency: "RWF", balance_after: 150000, description: "Personal withdrawal", created_at: "2024-04-01T00:00:00Z" },
  { id: "st-5", account_id: "sa-2", type: "deposit", amount: 100000, currency: "RWF", balance_after: 100000, description: "Initial deposit", created_at: "2024-01-20T00:00:00Z" },
  { id: "st-6", account_id: "sa-2", type: "deposit", amount: 80000, currency: "RWF", balance_after: 180000, description: "Monthly saving", created_at: "2024-02-20T00:00:00Z" },
  { id: "st-7", account_id: "sa-2", type: "deposit", amount: 100000, currency: "RWF", balance_after: 280000, description: "Monthly saving", created_at: "2024-03-20T00:00:00Z" },
];

export const demoChartOfAccounts: ChartOfAccount[] = [
  { id: "coa-1", organization_id: "org-1", code: "1000", name: "Cash and Bank", type: "asset", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-2", organization_id: "org-1", code: "1100", name: "Loans Receivable", type: "asset", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-3", organization_id: "org-1", code: "1200", name: "Interest Receivable", type: "asset", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-4", organization_id: "org-1", code: "2000", name: "Member Savings", type: "liability", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-5", organization_id: "org-1", code: "2100", name: "Interest Payable", type: "liability", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-6", organization_id: "org-1", code: "3000", name: "Share Capital", type: "equity", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-7", organization_id: "org-1", code: "3100", name: "Retained Earnings", type: "equity", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-8", organization_id: "org-1", code: "4000", name: "Interest Income", type: "income", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-9", organization_id: "org-1", code: "4100", name: "Penalty Income", type: "income", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-10", organization_id: "org-1", code: "4200", name: "Fee Income", type: "income", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-11", organization_id: "org-1", code: "5000", name: "Operating Expenses", type: "expense", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-12", organization_id: "org-1", code: "5100", name: "Interest Expense", type: "expense", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-13", organization_id: "org-1", code: "5200", name: "Salaries & Wages", type: "expense", is_system: true, created_at: "2024-01-01T00:00:00Z" },
  { id: "coa-14", organization_id: "org-1", code: "5300", name: "Rent & Utilities", type: "expense", is_system: true, created_at: "2024-01-01T00:00:00Z" },
];

export const demoAccountingEntries: AccountingEntry[] = [
  { id: "ae-1", organization_id: "org-1", date: "2024-03-01", reference_number: "JV-001", description: "Loan disbursement - LN-2024-001", debit_account_id: "coa-2", credit_account_id: "coa-1", amount: 500000, currency: "RWF", source_type: "loan", source_id: "l-1", created_at: "2024-03-01T00:00:00Z" },
  { id: "ae-2", organization_id: "org-1", date: "2024-04-01", reference_number: "JV-002", description: "Loan repayment - LN-2024-001", debit_account_id: "coa-1", credit_account_id: "coa-2", amount: 41667, currency: "RWF", source_type: "repayment", source_id: "r-1", created_at: "2024-04-01T00:00:00Z" },
  { id: "ae-3", organization_id: "org-1", date: "2024-04-01", reference_number: "JV-003", description: "Interest income - LN-2024-001", debit_account_id: "coa-1", credit_account_id: "coa-8", amount: 7500, currency: "RWF", source_type: "repayment", source_id: "r-1", created_at: "2024-04-01T00:00:00Z" },
  { id: "ae-4", organization_id: "org-1", date: "2024-01-15", reference_number: "JV-004", description: "Member deposit - SAV-001", debit_account_id: "coa-1", credit_account_id: "coa-4", amount: 50000, currency: "RWF", source_type: "savings", source_id: "st-1", created_at: "2024-01-15T00:00:00Z" },
  { id: "ae-5", organization_id: "org-1", date: "2024-06-01", reference_number: "JV-005", description: "Loan disbursement - LN-2024-002", debit_account_id: "coa-2", credit_account_id: "coa-1", amount: 300000, currency: "RWF", source_type: "loan", source_id: "l-2", created_at: "2024-06-01T00:00:00Z" },
  { id: "ae-6", organization_id: "org-1", date: "2024-08-05", reference_number: "JV-006", description: "Penalty income - LN-2024-001", debit_account_id: "coa-1", credit_account_id: "coa-9", amount: 4167, currency: "RWF", source_type: "repayment", source_id: "r-5", created_at: "2024-08-05T00:00:00Z" },
  { id: "ae-7", organization_id: "org-1", date: "2024-03-15", reference_number: "JV-007", description: "Operating expenses - Office rent", debit_account_id: "coa-14", credit_account_id: "coa-1", amount: 150000, currency: "RWF", created_at: "2024-03-15T00:00:00Z" },
  { id: "ae-8", organization_id: "org-1", date: "2024-03-30", reference_number: "JV-008", description: "Salaries payment - March", debit_account_id: "coa-13", credit_account_id: "coa-1", amount: 200000, currency: "RWF", created_at: "2024-03-30T00:00:00Z" },
];

export const demoAuditLogs: AuditLog[] = [
  { id: "al-1", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "CREATE", entity_type: "member", entity_id: "m-1", details: { name: "Jean MUTABAZI" }, created_at: "2024-01-15T10:00:00Z" },
  { id: "al-2", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "CREATE", entity_type: "loan", entity_id: "l-1", details: { loan_number: "LN-2024-001", amount: 500000 }, created_at: "2024-02-25T14:30:00Z" },
  { id: "al-3", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "APPROVE", entity_type: "loan", entity_id: "l-1", details: { loan_number: "LN-2024-001" }, created_at: "2024-02-28T09:00:00Z" },
  { id: "al-4", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "DISBURSE", entity_type: "loan", entity_id: "l-1", details: { amount: 500000 }, created_at: "2024-03-01T08:00:00Z" },
  { id: "al-5", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "DEPOSIT", entity_type: "savings", entity_id: "sa-1", details: { amount: 50000 }, created_at: "2024-01-15T11:00:00Z" },
  { id: "al-6", organization_id: "org-1", user_id: "user-1", user_name: "Dr. TUYISHIMIRE Gratien", action: "REPAYMENT", entity_type: "loan", entity_id: "l-1", details: { amount: 49167 }, created_at: "2024-04-01T10:00:00Z" },
];

export const demoProfiles: Profile[] = [
  demoProfile,
  { id: "profile-2", user_id: "user-2", organization_id: "org-1", full_name: "BIMARO Noel", role: "manager", email: "noel@tsk-tontine.rw", phone: "+250 788 000 002", created_at: "2024-01-01T00:00:00Z" },
  { id: "profile-3", user_id: "user-3", organization_id: "org-1", full_name: "UWASE Claudine", role: "teller", email: "claudine@tsk-tontine.rw", phone: "+250 788 000 003", created_at: "2024-01-15T00:00:00Z" },
];
