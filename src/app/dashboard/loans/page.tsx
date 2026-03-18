"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getLoans } from "@/lib/services/loans";
import { getMembers } from "@/lib/services/members";
import { formatCurrency } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Banknote,
  Eye,
  CreditCard,
  Loader2,
} from "lucide-react";
import type { Loan, Member, LoanStatus } from "@/lib/types/database";

const statusColors: Record<LoanStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  disbursed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  defaulted: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function LoansPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [loansData, membersData] = await Promise.all([
          getLoans(),
          getMembers(),
        ]);
        setLoans(loansData);
        setMembers(membersData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getMemberName(memberId: string): string {
    const member = members.find((m) => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : "Unknown";
  }

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const memberName = getMemberName(loan.member_id).toLowerCase();
      const matchesSearch =
        search === "" ||
        loan.loan_number.toLowerCase().includes(search.toLowerCase()) ||
        memberName.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, loans, members]);

  const totalLoans = loans.length;
  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "disbursed"
  ).length;
  const totalDisbursed = loans
    .filter((l) => l.disbursement_date)
    .reduce((sum, l) => sum + l.amount, 0);
  const totalOutstanding = loans.reduce(
    (sum, l) => sum + l.outstanding_balance,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        <Link href="/dashboard/loans/new">
          <Button>
            <Plus className="size-4 mr-1" />
            New Loan Application
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disbursed
            </CardTitle>
            <Banknote className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDisbursed, "RWF")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOutstanding, "RWF")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by loan number or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan Number</TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Interest Rate</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-center">Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Disbursement Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    No loans found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      {loan.loan_number}
                    </TableCell>
                    <TableCell>{getMemberName(loan.member_id)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(loan.amount, loan.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {loan.interest_rate}%
                    </TableCell>
                    <TableCell>
                      {loan.interest_method === "flat"
                        ? "Flat Rate"
                        : "Reducing Balance"}
                    </TableCell>
                    <TableCell className="text-center">
                      {loan.term_months}mo
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[loan.status]}`}
                      >
                        {loan.status.charAt(0).toUpperCase() +
                          loan.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {loan.disbursement_date || "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/loans/${loan.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4 mr-1" />
                          View
                        </Button>
                      </Link>
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
