"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency";
import { demoSavingsAccounts, demoMembers } from "@/lib/demo-data";
import { toast } from "sonner";

function getMemberName(memberId: string): string {
  const member = demoMembers.find((m) => m.id === memberId);
  return member ? `${member.first_name} ${member.last_name}` : "Unknown";
}

export default function QuickDepositPage() {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const selectedAccount = demoSavingsAccounts.find(
    (a) => a.id === selectedAccountId
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error("Please select a savings account.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }

    toast.success(
      `Deposit of ${formatCurrency(parsedAmount, selectedAccount?.currency || "RWF")} to ${selectedAccount?.account_number} recorded successfully.`
    );

    setSelectedAccountId("");
    setAmount("");
    setDescription("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/savings">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Savings
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Make a Deposit</h1>
        <p className="text-muted-foreground">
          Deposit funds into a member savings account.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Deposit Details</CardTitle>
          <CardDescription>
            Select an account and enter the deposit amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Selection */}
            <div className="space-y-2">
              <Label htmlFor="account">Savings Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {demoSavingsAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {getMemberName(acc.member_id)} - {acc.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="any"
                placeholder="Enter deposit amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Currency Display */}
            {selectedAccount && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  Currency:{" "}
                  <span className="font-medium text-foreground">
                    {selectedAccount.currency} (
                    {getCurrencySymbol(selectedAccount.currency)})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Current Balance:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      selectedAccount.balance,
                      selectedAccount.currency
                    )}
                  </span>
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Monthly saving, Initial deposit..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit">Submit Deposit</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/savings")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
