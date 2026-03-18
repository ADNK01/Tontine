"use client";

import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
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

export default function IncomeStatementPage() {
  const [periodFrom, setPeriodFrom] = useState("2024-01-01");
  const [periodTo, setPeriodTo] = useState("2024-12-31");

  const incomeAccounts = demoChartOfAccounts.filter((a) => a.type === "income");
  const expenseAccounts = demoChartOfAccounts.filter((a) => a.type === "expense");

  const accountTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const acc of demoChartOfAccounts) {
      totals[acc.id] = 0;
    }

    for (const entry of demoAccountingEntries) {
      if (entry.date < periodFrom || entry.date > periodTo) continue;

      const creditAcc = demoChartOfAccounts.find((a) => a.id === entry.credit_account_id);
      if (creditAcc && creditAcc.type === "income") {
        totals[creditAcc.id] = (totals[creditAcc.id] || 0) + entry.amount;
      }

      const debitAcc = demoChartOfAccounts.find((a) => a.id === entry.debit_account_id);
      if (debitAcc && debitAcc.type === "expense") {
        totals[debitAcc.id] = (totals[debitAcc.id] || 0) + entry.amount;
      }
    }

    return totals;
  }, [periodFrom, periodTo]);

  const totalIncome = incomeAccounts.reduce(
    (sum, acc) => sum + (accountTotals[acc.id] || 0),
    0
  );
  const totalExpenses = expenseAccounts.reduce(
    (sum, acc) => sum + (accountTotals[acc.id] || 0),
    0
  );
  const netIncome = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Income Statement
            </h1>
            <p className="text-sm text-muted-foreground">
              Profit and loss for a given period
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="period-from">From:</Label>
            <Input
              id="period-from"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="period-to">To:</Label>
            <Input
              id="period-to"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">TSK Tontine</CardTitle>
            <p className="text-sm font-semibold text-muted-foreground">
              Income Statement (Profit & Loss)
            </p>
            <p className="text-sm text-muted-foreground">
              For the period{" "}
              {new Date(periodFrom).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              to{" "}
              {new Date(periodTo).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Income */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-700">
                Income
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>
                        {acc.code} - {acc.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(accountTotals[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-green-50">
                    <TableCell>Total Income</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Expenses */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-700">
                Expenses
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>
                        {acc.code} - {acc.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(accountTotals[acc.id] || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-red-50">
                    <TableCell>Total Expenses</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalExpenses)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Net Income */}
            <Card
              className={`${
                netIncome >= 0
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-bold">Net Income</span>
                  <span
                    className={`font-bold text-xl ${
                      netIncome >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(netIncome)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Income ({formatCurrency(totalIncome)}) - Total Expenses (
                  {formatCurrency(totalExpenses)})
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
