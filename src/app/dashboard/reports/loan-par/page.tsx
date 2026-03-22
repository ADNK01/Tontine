"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { demoLoans, demoMembers } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";

interface AtRiskLoan {
  loanNumber: string;
  memberName: string;
  outstanding: number;
  daysOverdue: number;
  agingBucket: string;
}

const AGING_COLORS = ["#facc15", "#f97316", "#ef4444", "#991b1b"];

export default function LoanPARPage() {
  const activeLoans = useMemo(
    () => demoLoans.filter((l) => l.status === "active" || l.status === "disbursed"),
    []
  );

  const totalOutstanding = useMemo(
    () => activeLoans.reduce((sum, l) => sum + l.outstanding_balance, 0),
    [activeLoans]
  );

  const atRiskLoans: AtRiskLoan[] = useMemo(() => {
    const simulatedOverdue: Record<string, number> = {
      "l-1": 45,
      "l-2": 12,
    };

    return activeLoans
      .filter((l) => simulatedOverdue[l.id])
      .map((loan) => {
        const member = demoMembers.find((m) => m.id === loan.member_id);
        const days = simulatedOverdue[loan.id];
        let bucket = "1-30 days";
        if (days > 90) bucket = ">90 days";
        else if (days > 60) bucket = "61-90 days";
        else if (days > 30) bucket = "31-60 days";

        return {
          loanNumber: loan.loan_number,
          memberName: member ? `${member.first_name} ${member.last_name}` : "Unknown",
          outstanding: loan.outstanding_balance,
          daysOverdue: days,
          agingBucket: bucket,
        };
      });
  }, [activeLoans]);

  const overdueOutstanding = useMemo(
    () => atRiskLoans.reduce((sum, l) => sum + l.outstanding, 0),
    [atRiskLoans]
  );

  const parRatio = totalOutstanding > 0 ? (overdueOutstanding / totalOutstanding) * 100 : 0;

  const agingData = useMemo(() => {
    const buckets: Record<string, number> = {
      "1-30 days": 0,
      "31-60 days": 0,
      "61-90 days": 0,
      ">90 days": 0,
    };
    atRiskLoans.forEach((l) => {
      buckets[l.agingBucket] += l.outstanding;
    });
    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [atRiskLoans]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Loan Portfolio at Risk</h1>
        <p className="text-muted-foreground">
          Analyze overdue loans and portfolio-at-risk ratios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalOutstanding, "RWF")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(overdueOutstanding, "RWF")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PAR Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${parRatio > 10 ? "text-red-600" : parRatio > 5 ? "text-orange-500" : "text-green-600"}`}>
              {parRatio.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At-Risk Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{atRiskLoans.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              PAR by Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={agingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {agingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), "RWF")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No overdue loans
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aging Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "1-30 days", color: "bg-yellow-400" },
                { label: "31-60 days", color: "bg-orange-500" },
                { label: "61-90 days", color: "bg-red-500" },
                { label: ">90 days", color: "bg-red-900" },
              ].map((bucket) => {
                const amount = atRiskLoans
                  .filter((l) => l.agingBucket === bucket.label)
                  .reduce((sum, l) => sum + l.outstanding, 0);
                const pct = overdueOutstanding > 0 ? (amount / overdueOutstanding) * 100 : 0;
                return (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ${bucket.color}`} />
                        {bucket.label}
                      </span>
                      <span className="font-medium">{formatCurrency(amount, "RWF")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${bucket.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>At-Risk Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan Number</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
                <TableHead>Aging Bucket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No at-risk loans found.
                  </TableCell>
                </TableRow>
              ) : (
                atRiskLoans.map((loan) => (
                  <TableRow key={loan.loanNumber}>
                    <TableCell className="font-medium">{loan.loanNumber}</TableCell>
                    <TableCell>{loan.memberName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.outstanding, "RWF")}
                    </TableCell>
                    <TableCell className="text-right">{loan.daysOverdue}</TableCell>
                    <TableCell>
                      <Badge
                        variant={loan.daysOverdue > 60 ? "destructive" : "secondary"}
                      >
                        {loan.agingBucket}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
