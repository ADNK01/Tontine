"use client";

import { useMemo } from "react";
import { UserCheck, Trophy } from "lucide-react";
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
  demoMembers,
  demoLoans,
  demoRepayments,
  demoSavingsAccounts,
} from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";

interface MemberPerformance {
  id: string;
  name: string;
  totalSavings: number;
  activeLoans: number;
  repaymentRate: number;
  status: string;
}

export default function MemberPerformancePage() {
  const memberPerformance: MemberPerformance[] = useMemo(() => {
    return demoMembers.map((member) => {
      const savings = demoSavingsAccounts.find((sa) => sa.member_id === member.id);
      const memberLoans = demoLoans.filter((l) => l.member_id === member.id);
      const activeLoans = memberLoans.filter(
        (l) => l.status === "active" || l.status === "disbursed"
      ).length;

      const totalDue = memberLoans
        .filter((l) => l.status !== "pending" && l.status !== "rejected")
        .reduce((sum, l) => sum + l.amount + l.amount * (l.interest_rate / 100) * (l.term_months / 12), 0);
      const totalRepaid = memberLoans.reduce((sum, l) => sum + l.total_repaid, 0);
      const repaymentRate = totalDue > 0 ? Math.min((totalRepaid / totalDue) * 100, 100) : 0;

      return {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        totalSavings: savings?.balance ?? 0,
        activeLoans,
        repaymentRate: Math.round(repaymentRate),
        status: member.status,
      };
    });
  }, []);

  const topSavers = useMemo(
    () =>
      [...memberPerformance]
        .sort((a, b) => b.totalSavings - a.totalSavings)
        .slice(0, 3),
    [memberPerformance]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Member Performance</h1>
        <p className="text-muted-foreground">
          Track savings, loan activity, and repayment performance by member.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Savers
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {topSavers.map((member, index) => (
            <Card key={member.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </CardTitle>
                  <Badge
                    variant={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                  >
                    {index === 0 ? "Top Saver" : `#${index + 1}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{member.name}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(member.totalSavings, "RWF")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Member Performance Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead className="text-right">Total Savings</TableHead>
                <TableHead className="text-center">Active Loans</TableHead>
                <TableHead className="text-center">Repayment Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberPerformance.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(member.totalSavings, "RWF")}
                  </TableCell>
                  <TableCell className="text-center">{member.activeLoans}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        member.repaymentRate >= 80
                          ? "text-green-600 font-medium"
                          : member.repaymentRate >= 50
                          ? "text-yellow-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {member.repaymentRate > 0 ? `${member.repaymentRate}%` : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "active" ? "default" : "secondary"}
                      className={
                        member.status === "active"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : ""
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
