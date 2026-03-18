-- Simplified schema without auth references (for demo mode)
-- Run this in the Supabase SQL Editor

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  default_currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  national_id TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  photo_url TEXT,
  date_of_birth DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE RESTRICT NOT NULL,
  loan_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  interest_rate DECIMAL(5,2) NOT NULL,
  interest_method TEXT CHECK (interest_method IN ('flat', 'reducing_balance')) DEFAULT 'flat',
  term_months INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'disbursed', 'active', 'completed', 'defaulted', 'rejected')) DEFAULT 'pending',
  purpose TEXT,
  disbursement_date DATE,
  maturity_date DATE,
  total_repaid DECIMAL(15,2) DEFAULT 0,
  outstanding_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  interest DECIMAL(15,2) NOT NULL,
  penalty DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings accounts
CREATE TABLE IF NOT EXISTS savings_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE RESTRICT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  interest_rate DECIMAL(5,2) DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'frozen', 'closed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings transactions
CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES savings_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart of accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('asset', 'liability', 'income', 'expense', 'equity')) NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounting entries (double-entry)
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  credit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default organization
INSERT INTO organizations (id, name, default_currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'TSK Tontine', 'RWF')
ON CONFLICT (id) DO NOTHING;

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (id, organization_id, code, name, type, is_system) VALUES
  ('coa-1', '00000000-0000-0000-0000-000000000001', '1000', 'Cash', 'asset', true),
  ('coa-2', '00000000-0000-0000-0000-000000000001', '1100', 'Loans Receivable', 'asset', true),
  ('coa-3', '00000000-0000-0000-0000-000000000001', '1200', 'Interest Receivable', 'asset', true),
  ('coa-4', '00000000-0000-0000-0000-000000000001', '2000', 'Member Savings', 'liability', true),
  ('coa-5', '00000000-0000-0000-0000-000000000001', '2100', 'Accounts Payable', 'liability', true),
  ('coa-6', '00000000-0000-0000-0000-000000000001', '3000', 'Retained Earnings', 'equity', true),
  ('coa-7', '00000000-0000-0000-0000-000000000001', '3100', 'Member Equity', 'equity', true),
  ('coa-8', '00000000-0000-0000-0000-000000000001', '4000', 'Interest Income', 'income', true),
  ('coa-9', '00000000-0000-0000-0000-000000000001', '4100', 'Fee Income', 'income', true),
  ('coa-10', '00000000-0000-0000-0000-000000000001', '4200', 'Penalty Income', 'income', true),
  ('coa-11', '00000000-0000-0000-0000-000000000001', '5000', 'Operating Expenses', 'expense', true),
  ('coa-12', '00000000-0000-0000-0000-000000000001', '5100', 'Provision for Bad Debts', 'expense', true)
ON CONFLICT (id) DO NOTHING;
