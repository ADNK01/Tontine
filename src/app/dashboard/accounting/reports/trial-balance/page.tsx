"use client";

import { useState, useMemo } from "react";
import { Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { demoAccountingEntries, demoChartOfAccounts } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils/currency";

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState("2024-12-31");

  const trialBalance = useMemo(() => {
    const debits: Record<string, number> = {};
    const credits: Record<string, number> = {};

    for (const acc of demoChartOfAccounts) {
      debits[acc.id] = 0;
      credits[acc.id] = 0;
    }

    for (const entry of demoAccountingEntries) {
      if (asOfDate && entry.date > asOfDate) continue;
      debits[entry.debit_account_id] = (debits[entry.debit_account_id] || 0) + entry.amount;
      credits[entry.credit_account_id] = (credits[entry.credit_account_id] || 0) + entry.amount;
    }

    return demoChartOfAccounts.map((acc) => ({
      ...acc,
      debit: debits[acc.id] || 0,
      credit: credits[acc.id] || 0,
    }));
  }, [asOfDate]);

  const totalDebits = trialBalance.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredits = trialBalance.reduce((sum, acc) => sum + acc.credit, 0);
  const isBalanced = totalDebits === totalCredits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
            <p className="text-sm text-muted-foreground">
              Verify that debits equal credits across all accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="tb-date">As of:</Label>
          <Input
            id="tb-date"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">TSK Tontine</CardTitle>
            <p className="text-sm font-semibold text-muted-foreground">
              Trial Balance
            </p>
            <p className="text-sm text-muted-foreground">
              As of{" "}
              {new Date(asOfDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map((acc) => {
                  if (acc.debit === 0 && acc.credit === 0) return null;
                  return (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono">{acc.code}</TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell className="text-right">
                        {acc.debit > 0 ? formatCurrency(acc.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {acc.credit > 0 ? formatCurrency(acc.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-muted/50 border-t-2">
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      Totals
                      {isBalanced ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Balanced
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Unbalanced</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalDebits)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCredits)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
