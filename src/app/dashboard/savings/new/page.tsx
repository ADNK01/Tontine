"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMembers } from "@/lib/services/members";
import { createSavingsAccount } from "@/lib/services/savings";
import type { Member } from "@/lib/types/database";
import { toast } from "sonner";

export default function NewSavingsAccountPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [memberId, setMemberId] = useState("");
  const [currency, setCurrency] = useState("RWF");
  const [interestRate, setInterestRate] = useState("2");

  useEffect(() => {
    async function fetchMembers() {
      try {
        const data = await getMembers();
        setMembers(data);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!memberId) {
      toast.error("Please select a member.");
      return;
    }

    setSubmitting(true);
    try {
      await createSavingsAccount({
        member_id: memberId,
        currency,
        interest_rate: parseFloat(interestRate) || 0,
      });

      toast.success("Savings account created successfully!");
      router.push("/dashboard/savings");
    } catch (error) {
      toast.error("Failed to create savings account. Please try again.");
      console.error("Create savings account error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/savings" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Savings
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Savings Account
        </h1>
        <p className="text-muted-foreground">
          Create a new savings account for a member.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Select a member and configure the savings account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Member Selection */}
            <div className="space-y-2">
              <Label htmlFor="member">Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="member">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} {m.phone ? `- ${m.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                  <SelectItem value="XOF">XOF - CFA Franc</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Annual interest rate applied to the savings balance.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/savings")}
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
