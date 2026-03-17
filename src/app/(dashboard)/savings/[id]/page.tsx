"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import {
  demoSavingsAccounts,
  demoSavingsTransactions,
  demoMembers,
} from "@/lib/demo-data";
import { toast } from "sonner";

function getMemberName(memberId: string): string {
  const member = demoMembers.find((m) => m.id === memberId);
  return member ? `${member.first_name} ${member.last_name}` : "Unknown";
}

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

export default function SavingsAccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const account = demoSavingsAccounts.find((a) => a.id === accountId);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDescription, setWithdrawDescription] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const transactions = useMemo(() => {
    const accountTxns = demoSavingsTransactions.filter(
      (t) => t.account_id === accountId
    );
    if (typeFilter === "all") return accountTxns;
    return accountTxns.filter((t) => t.type === typeFilter);
  }, [accountId, typeFilter]);

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/savings">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Savings
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Savings account not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberName = getMemberName(account.member_id);

  function handleDeposit() {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }
    toast.success(
      `Deposit of ${formatCurrency(amount, account.currency)} to ${account.account_number} recorded successfully.`
    );
    setDepositAmount("");
    setDepositDescription("");
    setDepositOpen(false);
  }

  function handleWithdraw() {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }
    if (amount > account.balance) {
      toast.error(
        `Insufficient balance. Available: ${formatCurrency(account.balance, account.currency)}`
      );
      return;
    }
    toast.success(
      `Withdrawal of ${formatCurrency(amount, account.currency)} from ${account.account_number} recorded successfully.`
    );
    setWithdrawAmount("");
    setWithdrawDescription("");
    setWithdrawOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/savings">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Savings
          </Link>
        </Button>
      </div>

      {/* Account Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-purple-50 p-2">
                  <PiggyBank className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>{account.account_number}</CardTitle>
                  <CardDescription>{memberName}</CardDescription>
                </div>
              </div>
              {statusBadge(account.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-xl font-bold">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="text-xl font-bold">{account.currency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
                <p className="text-xl font-bold">{account.interest_rate}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opened</p>
                <p className="text-xl font-bold">
                  {new Date(account.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Deposit Dialog */}
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Deposit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Make a Deposit</DialogTitle>
                  <DialogDescription>
                    Deposit funds into {account.account_number} ({memberName})
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount ({account.currency})</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit-desc">Description</Label>
                    <Textarea
                      id="deposit-desc"
                      placeholder="e.g., Monthly saving"
                      value={depositDescription}
                      onChange={(e) => setDepositDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleDeposit}>Confirm Deposit</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Withdraw Dialog */}
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Make a Withdrawal</DialogTitle>
                  <DialogDescription>
                    Withdraw funds from {account.account_number} ({memberName}).
                    Available balance:{" "}
                    {formatCurrency(account.balance, account.currency)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">
                      Amount ({account.currency})
                    </Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-desc">Description</Label>
                    <Textarea
                      id="withdraw-desc"
                      placeholder="e.g., Personal withdrawal"
                      value={withdrawDescription}
                      onChange={(e) => setWithdrawDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleWithdraw}>Confirm Withdrawal</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All deposits and withdrawals for this account.
              </CardDescription>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      {new Date(txn.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {txn.type === "deposit" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Deposit
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          Withdrawal
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(txn.amount, txn.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(txn.balance_after, txn.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {txn.description || "-"}
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
