"use client";

import { useState, useMemo } from "react";
import { Plus, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { demoChartOfAccounts } from "@/lib/demo-data";
import type { AccountType } from "@/lib/types/database";

const typeBadgeColors: Record<AccountType, string> = {
  asset: "bg-blue-100 text-blue-800 border-blue-200",
  liability: "bg-red-100 text-red-800 border-red-200",
  equity: "bg-purple-100 text-purple-800 border-purple-200",
  income: "bg-green-100 text-green-800 border-green-200",
  expense: "bg-orange-100 text-orange-800 border-orange-200",
};

const typeLabels: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

const typeOrder: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

export default function ChartOfAccountsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "" as AccountType | "",
  });

  const groupedAccounts = useMemo(() => {
    const groups: Record<AccountType, typeof demoChartOfAccounts> = {
      asset: [],
      liability: [],
      equity: [],
      income: [],
      expense: [],
    };
    for (const acc of demoChartOfAccounts) {
      groups[acc.type].push(acc);
    }
    return groups;
  }, []);

  const handleAddAccount = () => {
    setDialogOpen(false);
    setNewAccount({ code: "", name: "", type: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Chart of Accounts
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your organization&apos;s chart of accounts
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="acc-code">Account Code</Label>
                <Input
                  id="acc-code"
                  placeholder="e.g. 1300"
                  value={newAccount.code}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, code: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="acc-name">Account Name</Label>
                <Input
                  id="acc-name"
                  placeholder="e.g. Prepaid Expenses"
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Type</Label>
                <Select
                  value={newAccount.type}
                  onValueChange={(value) =>
                    setNewAccount({ ...newAccount, type: value as AccountType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOrder.map((type) => (
                      <SelectItem key={type} value={type}>
                        {typeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddAccount} className="mt-2">
                Add Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {typeOrder.map((type) => {
        const accounts = groupedAccounts[type];
        if (accounts.length === 0) return null;
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${typeBadgeColors[type]}`}
                >
                  {typeLabels[type]}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({accounts.length} account{accounts.length !== 1 ? "s" : ""})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px]">System</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono font-medium">
                        {acc.code}
                      </TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${typeBadgeColors[acc.type]}`}
                        >
                          {acc.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {acc.is_system && (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
