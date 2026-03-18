"use client";

import { useState, useMemo } from "react";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import type { AccountType } from "@/lib/types/database";

function calculateBalances(asOfDate: string) {
  const balances: Record<string, number> = {};

  for (const acc of demoChartOfAccounts) {
    balances[acc.id] = 0;
  }

  for (const entry of demoAccountingEntries) {
    if (asOfDate && entry.date > asOfDate) continue;

    const debitAcc = demoChartOfAccounts.find((a) => a.id === entry.debit_account_id);
    const creditAcc = demoChartOfAccounts.find((a) => a.id === entry.credit_account_id);

    if (debitAcc) {
      if (debitAcc.type === "asset" || debitAcc.type === "expense") {
        balances[debitAcc.id] = (balances[debitAcc.id] || 0) + entry.amount;
      } else {
        balances[debitAcc.id] = (balances[debitAcc.id] || 0) - entry.amount;
      }
    }

    if (creditAcc) {
      if (creditAcc.type === "liability" || creditAcc.type === "equity" || creditAcc.type === "income") {
        balances[creditAcc.id] = (balances[creditAcc.id] || 0) + entry.amount;
      } else {
        balances[creditAcc.id] = (balances[creditAcc.id] || 0) - entry.amount;
      }
    }
  }

  return balances;
}

function getAccountsByType(type: AccountType) {
  return demoChartOfAccounts.filter((acc) => acc.type === type);
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState("2024-12-31");

  const balances = useMemo(() => calculateBalances(asOfDate), [asOfDate]);

  const assetAccounts = getAccountsByType("asset");
  const liabilityAccounts = getAccountsByType("liability");
  const equityAccounts = getAccountsByType("equity");

  const totalAssets = assetAccounts.reduce((sum, acc) => sum + (balances[acc.id] || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + (balances[acc.id] || 0), 0);
  const totalEquity = equityAccounts.reduce((sum, acc) => sum + (balances[acc.id] || 0), 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground">
              Financial position as of a specific date
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="as-of-date">As of:</Label>
          <Input
            id="as-of-date"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">TSK Tontine</CardTitle>
            <p className="text-sm font-semibold text-muted-foreground">
              Balance Sheet
            </p>
            <p className="text-sm text-muted-foreground">
              As of {asOfDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assets */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Assets</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>{acc.code} - {acc.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balances[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Assets</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalAssets)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Liabilities */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Liabilities</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liabilityAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>{acc.code} - {acc.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balances[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Liabilities</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalLiabilities)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Equity */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Equity</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equityAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>{acc.code} - {acc.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balances[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Equity</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalEquity)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Equation */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-lg">
                  <div>
                    <span className="font-semibold">Total Assets</span>
                    <span className="ml-2 font-bold">
                      {formatCurrency(totalAssets)}
                    </span>
                  </div>
                  <span className="text-muted-foreground">=</span>
                  <div>
                    <span className="font-semibold">
                      Total Liabilities + Equity
                    </span>
                    <span className="ml-2 font-bold">
                      {formatCurrency(totalLiabilitiesAndEquity)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
