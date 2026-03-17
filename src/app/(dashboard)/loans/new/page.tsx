"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { demoMembers } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";
import { calculateTotalInterest } from "@/lib/utils/interest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Calculator } from "lucide-react";
import { toast } from "sonner";
import type { InterestMethod } from "@/lib/types/database";

export default function NewLoanPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("RWF");
  const [interestRate, setInterestRate] = useState<number>(18);
  const [interestMethod, setInterestMethod] = useState<InterestMethod>("flat");
  const [termMonths, setTermMonths] = useState<number>(12);
  const [purpose, setPurpose] = useState("");

  const preview = useMemo(() => {
    if (amount <= 0 || interestRate <= 0 || termMonths <= 0) {
      return null;
    }
    const totalInterest = calculateTotalInterest(
      amount,
      interestRate,
      termMonths,
      interestMethod
    );
    const totalRepayment = amount + totalInterest;
    const monthlyPayment = totalRepayment / termMonths;
    return {
      totalInterest,
      totalRepayment,
      monthlyPayment,
    };
  }, [amount, interestRate, termMonths, interestMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      toast.error("Please select a member.");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    toast.success("Loan application submitted successfully!");
    router.push("/loans");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          New Loan Application
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoMembers
                        .filter((m) => m.status === "active")
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter loan amount"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      min={0}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Method</Label>
                    <Select
                      value={interestMethod}
                      onValueChange={(val) =>
                        setInterestMethod(val as InterestMethod)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="reducing_balance">
                          Reducing Balance
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Term in Months</Label>
                  <Input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    min={1}
                    max={60}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    placeholder="Describe the purpose of this loan..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit">Submit Application</Button>
              <Link href="/loans">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="size-4" />
                  Loan Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Loan Amount
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(amount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Interest
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(preview.totalInterest, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Repayment
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(preview.totalRepayment, currency)}
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Monthly Payment
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(preview.monthlyPayment, currency)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        Rate: {interestRate}% per annum (
                        {interestMethod === "flat"
                          ? "Flat Rate"
                          : "Reducing Balance"}
                        )
                      </p>
                      <p>Term: {termMonths} months</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter loan details to see a preview of the repayment
                    calculation.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
