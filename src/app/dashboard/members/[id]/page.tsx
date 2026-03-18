"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import { getMember } from "@/lib/services/members";
import { createClient } from "@/lib/supabase/client";
import type { Member, MemberStatus, Loan, SavingsAccount } from "@/lib/types/database";

const statusColors: Record<MemberStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  suspended: "bg-red-100 text-red-800",
};

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [member, setMember] = useState<Member | null>(null);
  const [memberLoans, setMemberLoans] = useState<Loan[]>([]);
  const [memberSavings, setMemberSavings] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const [memberData, loansResult, savingsResult] = await Promise.all([
          getMember(id),
          supabase
            .from("loans")
            .select("*")
            .eq("member_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("savings_accounts")
            .select("*")
            .eq("member_id", id)
            .order("created_at", { ascending: false }),
        ]);
        setMember(memberData);
        setMemberLoans(loansResult.data || []);
        setMemberSavings(savingsResult.data || []);
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/dashboard/members" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Member not found</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            The member you are looking for does not exist or has been removed.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/dashboard/members" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {member.first_name} {member.last_name}
            </h1>
            <p className="text-muted-foreground">Member details</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[member.status]}`}
                >
                  {member.status.charAt(0).toUpperCase() +
                    member.status.slice(1)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        National ID
                      </p>
                      <p className="text-sm font-medium">
                        {member.national_id || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{member.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">
                        {member.email || "-"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">
                        {member.address || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date of Birth
                      </p>
                      <p className="text-sm font-medium">
                        {member.date_of_birth || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Join Date
                      </p>
                      <p className="text-sm font-medium">
                        {member.join_date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle>Loans</CardTitle>
              <CardDescription>
                {memberLoans.length === 0
                  ? "No loans found for this member."
                  : `${memberLoans.length} loan(s) on record`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberLoans.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {loan.loan_number}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(loan.amount, loan.currency)}
                        </TableCell>
                        <TableCell>
                          {loan.interest_rate}% ({loan.interest_method})
                        </TableCell>
                        <TableCell>{loan.term_months} months</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              loan.status === "active"
                                ? "bg-green-100 text-green-800"
                                : loan.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : loan.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : loan.status === "defaulted"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {loan.status.charAt(0).toUpperCase() +
                              loan.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            loan.outstanding_balance,
                            loan.currency
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="savings">
          <Card>
            <CardHeader>
              <CardTitle>Savings Accounts</CardTitle>
              <CardDescription>
                {memberSavings.length === 0
                  ? "No savings accounts found for this member."
                  : `${memberSavings.length} account(s) on record`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberSavings.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {memberSavings.map((account) => (
                    <Card key={account.id} size="sm">
                      <CardHeader>
                        <CardTitle>{account.account_number}</CardTitle>
                        <CardDescription>
                          Interest rate: {account.interest_rate}%
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Balance
                            </span>
                            <span className="font-bold">
                              {formatCurrency(account.balance, account.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Status
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                account.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : account.status === "frozen"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {account.status.charAt(0).toUpperCase() +
                                account.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Opened
                            </span>
                            <span className="text-sm">
                              {account.created_at}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
