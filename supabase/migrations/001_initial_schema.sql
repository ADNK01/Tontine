-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  default_currency TEXT DEFAULT 'RWF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles linked to auth.users
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'teller', 'member')) DEFAULT 'teller',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tontine members
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
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
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  total_repaid DECIMAL(15,2) DEFAULT 0,
  outstanding_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan repayments
CREATE TABLE loan_repayments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  interest DECIMAL(15,2) NOT NULL,
  penalty DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'RWF',
  payment_date DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Savings accounts
CREATE TABLE savings_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES savings_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('deposit', 'withdrawal')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart of accounts
CREATE TABLE chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('asset', 'liability', 'income', 'expense', 'equity')) NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Accounting entries (double-entry)
CREATE TABLE accounting_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  credit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'RWF',
  source_type TEXT,
  source_id UUID,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization settings
CREATE TABLE org_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  default_interest_rate DECIMAL(5,2) DEFAULT 18.00,
  default_interest_method TEXT DEFAULT 'flat',
  default_loan_term INTEGER DEFAULT 12,
  penalty_rate DECIMAL(5,2) DEFAULT 2.00,
  savings_interest_rate DECIMAL(5,2) DEFAULT 5.00,
  fiscal_year_start INTEGER DEFAULT 1
);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access data in their organization)
CREATE POLICY "Users can view own org" ON organizations
  FOR ALL USING (id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can access org members" ON members
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access org loans" ON loans
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access loan repayments" ON loan_repayments
  FOR ALL USING (loan_id IN (SELECT id FROM loans WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can access org savings" ON savings_accounts
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access savings txns" ON savings_transactions
  FOR ALL USING (account_id IN (SELECT id FROM savings_accounts WHERE organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can access org accounts" ON chart_of_accounts
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access org entries" ON accounting_entries
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access org audit" ON audit_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access org settings" ON org_settings
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
