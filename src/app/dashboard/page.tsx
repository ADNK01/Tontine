"use client";

import { useState, useEffect } from "react";
import { Users, Banknote, PiggyBank, TrendingUp, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { getMembers } from "@/lib/services/members";
import { getLoans } from "@/lib/services/loans";
import { getSavingsAccounts } from "@/lib/services/savings";
import { createClient } from "@/lib/supabase/client";
import type { Member, Loan, SavingsAccount, AuditLog } from "@/lib/types/database";
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
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const supabase = createClient();
        const [membersData, loansData, savingsData, logsResult] =
          await Promise.all([
            getMembers(),
            getLoans(),
            getSavingsAccounts(),
            supabase
              .from("audit_logs")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(5),
          ]);
        setMembers(membersData);
        setLoans(loansData);
        setSavingsAccounts(savingsData);
        setAuditLogs(logsResult.data || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === "active").length;

  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "disbursed"
  );
  const activeLoansCount = activeLoans.length;
  const activeLoansTotal = activeLoans.reduce(
    (sum, l) => sum + (l.outstanding_balance || 0),
    0
  );

  const totalSavings = savingsAccounts.reduce(
    (sum, sa) => sum + (sa.balance || 0),
    0
  );

  // Revenue: sum of repaid interest from loans (total_repaid - principal repaid approximation)
  const totalRepaid = loans.reduce((sum, l) => sum + (l.total_repaid || 0), 0);

  // Loan portfolio data for pie chart
  const loanStatusCounts = loans.reduce(
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

  // Savings per member for bar chart
  const savingsBarData = savingsAccounts
    .filter((sa) => sa.balance > 0)
    .slice(0, 8)
    .map((sa) => {
      const member = members.find((m) => m.id === sa.member_id);
      const label = member
        ? `${member.first_name.charAt(0)}. ${member.last_name}`
        : sa.account_number;
      return { name: label, amount: sa.balance };
    });

  const stats = [
    {
      title: "Total Members",
      value: totalMembers.toString(),
      description: `${activeMembers} active`,
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
      description: `${savingsAccounts.length} accounts`,
      icon: PiggyBank,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Total Repaid",
      value: formatCurrency(totalRepaid),
      description: "From loan repayments",
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, Admin
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
            {loanPieData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No loans yet
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings by Member</CardTitle>
            <CardDescription>Top savings account balances</CardDescription>
          </CardHeader>
          <CardContent>
            {savingsBarData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No savings accounts yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={savingsBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    tickFormatter={(value) =>
                      `${(value / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Balance",
                    ]}
                  />
                  <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent activity
              </p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {log.action} - {log.entity_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_name ? `by ${log.user_name}` : "System"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.created_at}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
