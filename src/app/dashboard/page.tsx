"use client";

import { useState } from "react";
import { Users, Banknote, PiggyBank, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import {
  demoProfile,
  demoMembers,
  demoLoans,
  demoSavingsAccounts,
  demoAccountingEntries,
  demoAuditLogs,
} from "@/lib/demo-data";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const totalMembers = demoMembers.length;

  const activeLoans = demoLoans.filter(
    (l) => l.status === "active" || l.status === "disbursed"
  );
  const activeLoansCount = activeLoans.length;
  const activeLoansTotal = activeLoans.reduce(
    (sum, l) => sum + l.outstanding_balance,
    0
  );

  const totalSavings = demoSavingsAccounts.reduce(
    (sum, sa) => sum + sa.balance,
    0
  );

  const revenueThisMonth = demoAccountingEntries
    .filter((ae) => {
      return (
        ae.credit_account_id === "coa-8" ||
        ae.credit_account_id === "coa-9" ||
        ae.credit_account_id === "coa-10"
      );
    })
    .reduce((sum, ae) => sum + ae.amount, 0);

  const recentLogs = [...demoAuditLogs]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Loan portfolio data for pie chart
  const loanStatusCounts = demoLoans.reduce(
    (acc, loan) => {
      acc[loan.status] = (acc[loan.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const loanPieData = Object.entries(loanStatusCounts).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })
  );

  // Monthly savings growth data (simulated last 6 months)
  const monthlySavingsData = [
    { month: "Oct", amount: 320000 },
    { month: "Nov", amount: 480000 },
    { month: "Dec", amount: 610000 },
    { month: "Jan", amount: 720000 },
    { month: "Feb", amount: 880000 },
    { month: "Mar", amount: totalSavings },
  ];

  const stats = [
    {
      title: "Total Members",
      value: totalMembers.toString(),
      description: `${demoMembers.filter((m) => m.status === "active").length} active`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Active Loans",
      value: activeLoansCount.toString(),
      description: formatCurrency(activeLoansTotal),
      icon: Banknote,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Savings",
      value: formatCurrency(totalSavings),
      description: `${demoSavingsAccounts.length} accounts`,
      icon: PiggyBank,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Revenue This Month",
      value: formatCurrency(revenueThisMonth),
      description: "From interest & fees",
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {demoProfile.full_name}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your tontine operations.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Portfolio</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={loanPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {loanPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Savings Growth</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySavingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) =>
                    `${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Savings",
                  ]}
                />
                <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 5 audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-md border p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {log.action} - {log.entity_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by {log.user_name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {log.created_at}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
