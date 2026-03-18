"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PiggyBank,
  Search,
  Plus,
  Eye,
  Wallet,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils/currency";
import { getSavingsAccounts } from "@/lib/services/savings";
import { getMembers } from "@/lib/services/members";
import type { SavingsAccount } from "@/lib/types/database";
import type { Member } from "@/lib/types/database";

function statusBadge(status: "active" | "frozen" | "closed") {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Active
        </Badge>
      );
    case "frozen":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          Frozen
        </Badge>
      );
    case "closed":
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          Closed
        </Badge>
      );
  }
}

export default function SavingsAccountsPage() {
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsData, membersData] = await Promise.all([
          getSavingsAccounts(),
          getMembers(),
        ]);
        setAccounts(accountsData);
        setMembers(membersData);
      } catch (error) {
        console.error("Failed to fetch savings data:", error);
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

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter((acc) => {
      const memberName = getMemberName(acc.member_id).toLowerCase();
      return (
        acc.account_number.toLowerCase().includes(q) ||
        memberName.includes(q)
      );
    });
  }, [search, accounts, members]);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + acc.balance,
    0
  );
  const activeAccounts = accounts.filter(
    (acc) => acc.status === "active"
  ).length;
  const averageBalance =
    accounts.length > 0
      ? totalBalance / accounts.length
      : 0;

  const stats = [
    {
      title: "Total Accounts",
      value: accounts.length.toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: Wallet,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Active Accounts",
      value: activeAccounts.toString(),
      icon: PiggyBank,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Average Balance",
      value: formatCurrency(averageBalance),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Savings Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage member savings accounts and transactions.
          </p>
        </div>
        <Button render={<Link href="/dashboard/savings/deposit" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
        </Button>
      </div>

      {/* Summary Cards */}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by account number or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Interest Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No savings accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.account_number}
                    </TableCell>
                    <TableCell>{getMemberName(account.member_id)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.balance, account.currency)}
                    </TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="text-right">
                      {account.interest_rate}%
                    </TableCell>
                    <TableCell>{statusBadge(account.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" render={<Link href={`/dashboard/savings/${account.id}`} />}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                      </Button>
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
