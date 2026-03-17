"use client";

import { useState, useMemo } from "react";
import { use } from "react";
import Link from "next/link";
import { demoLoans, demoMembers, demoRepayments } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";
import { generateRepaymentSchedule } from "@/lib/utils/interest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Banknote,
  Calendar,
  CreditCard,
  User,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { LoanStatus } from "@/lib/types/database";

const statusConfig: Record<
  LoanStatus,
  { color: string; label: string }
> = {
  pending: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    label: "Pending",
  },
  approved: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Approved",
  },
  disbursed: {
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    label: "Disbursed",
  },
  active: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    label: "Active",
  },
  completed: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    label: "Completed",
  },
  defaulted: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    label: "Defaulted",
  },
  rejected: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    label: "Rejected",
  },
};

export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState("");

  const loan = demoLoans.find((l) => l.id === id);
  const member = loan
    ? demoMembers.find((m) => m.id === loan.member_id)
    : null;
  const loanRepayments = loan
    ? demoRepayments.filter((r) => r.loan_id === loan.id)
    : [];

  const schedule = useMemo(() => {
    if (!loan || !loan.disbursement_date) return [];
    return generateRepaymentSchedule(
      loan.amount,
      loan.interest_rate,
      loan.term_months,
      loan.interest_method,
      new Date(loan.disbursement_date)
    );
  }, [loan]);

  const totalRepaid = loanRepayments.reduce((sum, r) => sum + r.amount, 0);
  const nextPayment = schedule.find((s) => {
    const scheduleDate = new Date(s.date);
    return scheduleDate > new Date() && s.balance > 0;
  });

  if (!loan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/loans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" />
              Back to Loans
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">Loan not found.</p>
            <Link href="/loans" className="mt-4 inline-block">
              <Button variant="outline">Return to Loans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberName = member
    ? `${member.first_name} ${member.last_name}`
    : "Unknown";
  const status = statusConfig[loan.status];

  const handleApprove = () => {
    toast.success(`Loan ${loan.loan_number} approved successfully.`);
  };

  const handleReject = () => {
    toast.error(`Loan ${loan.loan_number} has been rejected.`);
  };

  const handleDisburse = () => {
    toast.success(`Loan ${loan.loan_number} disbursed successfully.`);
  };

  const handleRecordPayment = () => {
    if (paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    toast.success(
      `Payment of ${formatCurrency(paymentAmount, loan.currency)} recorded successfully.`
    );
    setPaymentOpen(false);
    setPaymentAmount(0);
    setPaymentNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/loans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {loan.loan_number}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loan.status === "pending" && (
            <>
              <Button onClick={handleApprove}>
                <CheckCircle className="size-4 mr-1" />
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                <XCircle className="size-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          {loan.status === "approved" && (
            <Button onClick={handleDisburse}>
              <Banknote className="size-4 mr-1" />
              Disburse
            </Button>
          )}
          {loan.status === "active" && (
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <CreditCard className="size-4 mr-1" />
                    Record Payment
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a repayment for loan {loan.loan_number}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter payment amount"
                      value={paymentAmount || ""}
                      onChange={(e) =>
                        setPaymentAmount(Number(e.target.value))
                      }
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Optional payment notes..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setPaymentOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleRecordPayment}>
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <FileText className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Loan Number
                    </p>
                    <p className="font-medium">{loan.loan_number}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member</p>
                    <p className="font-medium">{memberName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Banknote className="size-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      {formatCurrency(loan.amount, loan.currency)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Interest Rate
                  </p>
                  <p className="font-medium">{loan.interest_rate}% p.a.</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium">
                    {loan.interest_method === "flat"
                      ? "Flat Rate"
                      : "Reducing Balance"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className="font-medium">{loan.term_months} months</p>
                </div>
                {loan.disbursement_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Disbursement Date
                      </p>
                      <p className="font-medium">{loan.disbursement_date}</p>
                    </div>
                  </div>
                )}
                {loan.maturity_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Maturity Date
                      </p>
                      <p className="font-medium">{loan.maturity_date}</p>
                    </div>
                  </div>
                )}
                {loan.purpose && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{loan.purpose}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {schedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Repayment Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((item) => (
                      <TableRow key={item.period}>
                        <TableCell className="text-center">
                          {item.period}
                        </TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.payment, loan.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.principal, loan.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.interest, loan.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.balance, loan.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {loanRepayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Repayment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Penalty</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanRepayments.map((repayment) => (
                      <TableRow key={repayment.id}>
                        <TableCell>{repayment.payment_date}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(repayment.amount, repayment.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            repayment.principal,
                            repayment.currency
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            repayment.interest,
                            repayment.currency
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {repayment.penalty > 0
                            ? formatCurrency(
                                repayment.penalty,
                                repayment.currency
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>{repayment.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Repaid</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalRepaid, loan.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Outstanding Balance
                </p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(loan.outstanding_balance, loan.currency)}
                </p>
              </div>
              {nextPayment && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Next Payment Due
                  </p>
                  <p className="font-medium">{nextPayment.date}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Amount:{" "}
                    {formatCurrency(nextPayment.payment, loan.currency)}
                  </p>
                </div>
              )}
              {loan.status === "completed" && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    This loan has been fully repaid.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
