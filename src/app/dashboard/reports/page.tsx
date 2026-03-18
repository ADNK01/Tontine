"use client";

import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  UserCheck,
  Scale,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const reports = [
  {
    title: "Financial Summary",
    description: "Overview of revenue, expenses, net income, and key financial metrics across periods.",
    href: "/dashboard/reports/financial",
    icon: FileText,
  },
  {
    title: "Loan Portfolio at Risk",
    description: "Analyze overdue loans, PAR ratios, and aging distribution of the loan portfolio.",
    href: "/dashboard/reports/loan-par",
    icon: AlertTriangle,
  },
  {
    title: "Member Performance",
    description: "Track member savings, loan repayment rates, and individual performance metrics.",
    href: "/dashboard/reports/member-performance",
    icon: UserCheck,
  },
  {
    title: "Balance Sheet",
    description: "View assets, liabilities, and equity positions at a point in time.",
    href: "/dashboard/accounting/reports/balance-sheet",
    icon: Scale,
  },
  {
    title: "Income Statement",
    description: "Revenue and expense summary showing net income for a given period.",
    href: "/dashboard/accounting/reports/income-statement",
    icon: TrendingUp,
  },
  {
    title: "Trial Balance",
    description: "Listing of all account balances to verify debits equal credits.",
    href: "/dashboard/accounting/reports/trial-balance",
    icon: BookOpen,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Access financial reports, portfolio analysis, and member performance data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {report.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
