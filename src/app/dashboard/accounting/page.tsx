"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, BookOpen, Loader2, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils/currency";
import {
  getAccountingEntries,
  getChartOfAccounts,
  createAccountingEntry,
  deleteAccountingEntry,
} from "@/lib/services/accounting";
import { createAuditLog } from "@/lib/services/audit";
import { useRole } from "@/lib/contexts/role-context";
import type { AccountingEntry, ChartOfAccount } from "@/lib/types/database";
import { toast } from "sonner";

export default function AccountingJournalEntriesPage() {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { canEdit, canDelete, userName } = useRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newEntry, setNewEntry] = useState({
    date: "",
    description: "",
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
    currency: "RWF",
  });

  async function fetchData() {
    try {
      const [entriesData, accountsData] = await Promise.all([
        getAccountingEntries(),
        getChartOfAccounts(),
      ]);
      setEntries(entriesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Failed to fetch accounting data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const acc of accounts) {
      map[acc.id] = `${acc.code} - ${acc.name}`;
    }
    return map;
  }, [accounts]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!entry.description.toLowerCase().includes(q)) return false;
      }
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;
      return true;
    });
  }, [searchQuery, dateFrom, dateTo, entries]);

  async function handleNewEntry() {
    if (!newEntry.date || !newEntry.description || !newEntry.debit_account_id || !newEntry.credit_account_id || !newEntry.amount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const parsedAmount = parseFloat(newEntry.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (newEntry.debit_account_id === newEntry.credit_account_id) {
      toast.error("Debit and credit accounts must be different.");
      return;
    }
    setSubmitting(true);
    try {
      await createAccountingEntry({
        date: newEntry.date,
        description: newEntry.description,
        debit_account_id: newEntry.debit_account_id,
        credit_account_id: newEntry.credit_account_id,
        amount: parsedAmount,
        currency: newEntry.currency,
        source_type: "manual",
      });
      toast.success("Journal entry created successfully!");
      setDialogOpen(false);
      setNewEntry({ date: "", description: "", debit_account_id: "", credit_account_id: "", amount: "", currency: "RWF" });
      setLoading(true);
      await fetchData();
    } catch (error) {
      toast.error("Failed to create journal entry.");
      console.error("Create entry error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const handleDeleteEntry = async (entry: AccountingEntry) => {
    if (!confirm(`Delete entry ${entry.reference_number}?`)) return;
    try {
      await deleteAccountingEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      await createAuditLog({
        user_name: userName || "Unknown",
        action: "delete",
        entity_type: "accounting_entry",
        entity_id: entry.id,
        details: { reference: entry.reference_number },
      });
      toast.success("Entry deleted.");
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounting - Journal Entries</h1>
            <p className="text-sm text-muted-foreground">View and manage all accounting journal entries</p>
          </div>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Journal Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="entry-date">Date</Label>
                  <Input id="entry-date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entry-description">Description</Label>
                  <Input id="entry-description" placeholder="Entry description" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Debit Account</Label>
                  <Select value={newEntry.debit_account_id} onValueChange={(value: string) => setNewEntry({ ...newEntry, debit_account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select debit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Credit Account</Label>
                  <Select value={newEntry.credit_account_id} onValueChange={(value: string) => setNewEntry({ ...newEntry, credit_account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="entry-amount">Amount</Label>
                    <Input id="entry-amount" type="number" placeholder="0" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select value={newEntry.currency} onValueChange={(value: string) => setNewEntry({ ...newEntry, currency: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RWF">RWF</SelectItem>
                        <SelectItem value="XOF">XOF</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleNewEntry} disabled={submitting} className="mt-2">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by description..." className="pl-9 w-[280px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Debit Account</TableHead>
                <TableHead>Credit Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Source</TableHead>
                {canDelete && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canDelete ? 8 : 7} className="text-center py-8 text-muted-foreground">No journal entries found.</TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                    <TableCell><Badge variant="outline">{entry.reference_number}</Badge></TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{accountMap[entry.debit_account_id] || entry.debit_account_id}</TableCell>
                    <TableCell>{accountMap[entry.credit_account_id] || entry.credit_account_id}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount, entry.currency)}</TableCell>
                    <TableCell>
                      {entry.source_type ? <Badge variant="secondary">{entry.source_type}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteEntry(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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
