"use client";

import { useState, useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  demoAccountingEntries,
  demoChartOfAccounts,
  demoLoans,
  demoSavingsAccounts,
} from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";

type Period = "monthly" | "quarterly" | "annual";

function getMonthKey(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function FinancialSummaryPage() {
  const [period, setPeriod] = useState<Period>("monthly");

  const incomeAccountIds = demoChartOfAccounts
    .filter((a) => a.type === "income")
    .map((a) => a.id);
  const expenseAccountIds = demoChartOfAccounts
    .filter((a) => a.type === "expense")
    .map((a) => a.id);

  const totalRevenue = useMemo(
    () =>
      demoAccountingEntries
        .filter((e) => incomeAccountIds.includes(e.credit_account_id))
        .reduce((sum, e) => sum + e.amount, 0),
    [incomeAccountIds]
  );

  const totalExpenses = useMemo(
    () =>
      demoAccountingEntries
        .filter((e) => expenseAccountIds.includes(e.debit_account_id))
        .reduce((sum, e) => sum + e.amount, 0),
    [expenseAccountIds]
  );

  const netIncome = totalRevenue - totalExpenses;

  const totalDisbursements = useMemo(
    () =>
      demoLoans
        .filter((l) => l.disbursement_date)
        .reduce((sum, l) => sum + l.amount, 0),
    []
  );

  const totalSavings = useMemo(
    () => demoSavingsAccounts.reduce((sum, a) => sum + a.balance, 0),
    []
  );

  const revenueExpenseData = useMemo(() => {
    const monthMap: Record<string, { revenue: number; expenses: number }> = {};

    demoAccountingEntries.forEach((entry) => {
      const key = getMonthKey(entry.date);
      if (!monthMap[key]) monthMap[key] = { revenue: 0, expenses: 0 };

      if (incomeAccountIds.includes(entry.credit_account_id)) {
        monthMap[key].revenue += entry.amount;
      }
      if (expenseAccountIds.includes(entry.debit_account_id)) {
        monthMap[key].expenses += entry.amount;
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: getMonthLabel(key),
        Revenue: val.revenue,
        Expenses: val.expenses,
      }));
  }, [incomeAccountIds, expenseAccountIds]);

  const savingsGrowthData = useMemo(() => {
    const months = [
      { month: "Jan 2024", savings: 50000 },
      { month: "Feb 2024", savings: 230000 },
      { month: "Mar 2024", savings: 505000 },
      { month: "Apr 2024", savings: 480000 },
      { month: "May 2024", savings: 580000 },
      { month: "Jun 2024", savings: 720000 },
      { month: "Jul 2024", savings: 820000 },
      { month: "Aug 2024", savings: 920000 },
      { month: "Sep 2024", savings: 1020000 },
    ];
    return months;
  }, []);

  const handleExportCSV = () => {
    const rows = [
      ["Metric", "Value (RWF)"],
      ["Total Revenue", totalRevenue.toString()],
      ["Total Expenses", totalExpenses.toString()],
      ["Net Income", netIncome.toString()],
      ["Loan Disbursements", totalDisbursements.toString()],
      ["Total Savings", totalSavings.toString()],
      [""],
      ["Month", "Revenue", "Expenses"],
      ...revenueExpenseData.map((d) => [d.month, d.Revenue.toString(), d.Expenses.toString()]),
    ];
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue, "RWF"), color: "text-green-600" },
    { label: "Total Expenses", value: formatCurrency(totalExpenses, "RWF"), color: "text-red-600" },
    { label: "Net Income", value: formatCurrency(netIncome, "RWF"), color: netIncome >= 0 ? "text-green-600" : "text-red-600" },
    { label: "Loan Disbursements", value: formatCurrency(totalDisbursements, "RWF"), color: "text-blue-600" },
    { label: "Savings Growth", value: formatCurrency(totalSavings, "RWF"), color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Summary</h1>
          <p className="text-muted-foreground">
            Overview of revenue, expenses, and key financial metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Revenue vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), "RWF")} />
                <Legend />
                <Bar dataKey="Revenue" fill="#22c55e" />
                <Bar dataKey="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cumulative Savings Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={savingsGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), "RWF")} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="savings"
                  name="Total Savings"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
