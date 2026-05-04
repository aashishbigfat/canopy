"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  opportunityWorkflowService,
  type LedgerEntry,
} from "@/lib/api/services/opportunity-workflow.service";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

export function LedgerTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    entry_type: "debit",
    amount: 0,
    currency: "INR",
    description: "",
    counterparty: "",
    reference_no: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await opportunityWorkflowService.listLedger(opportunityId));
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  async function create() {
    if (!draft.amount) {
      toast.error("Amount required");
      return;
    }
    try {
      await opportunityWorkflowService.createLedger(opportunityId, draft);
      setOpen(false);
      setDraft({ entry_type: "debit", amount: 0, currency: "INR", description: "", counterparty: "", reference_no: "" });
      await load();
      toast.success("Entry added");
    } catch {
      toast.error("Create failed");
    }
  }

  const totalDebit = items.filter((i) => i.entry_type === "debit").reduce((a, b) => a + b.amount, 0);
  const totalCredit = items
    .filter((i) => i.entry_type === "credit")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Debit / credit ledger. Net: {(totalCredit - totalDebit).toLocaleString()}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New ledger entry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.entry_type}
                  onValueChange={(v) => setDraft({ ...draft, entry_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (paid out)</SelectItem>
                    <SelectItem value="credit">Credit (received)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Counterparty</Label>
                <Input
                  value={draft.counterparty}
                  onChange={(e) => setDraft({ ...draft, counterparty: e.target.value })}
                />
              </div>
              <div>
                <Label>Reference no.</Label>
                <Input
                  value={draft.reference_no}
                  onChange={(e) => setDraft({ ...draft, reference_no: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No ledger entries.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Counterparty</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {i.entry_date.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        i.entry_type === "credit" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {i.entry_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{i.amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">{i.currency}</td>
                  <td className="px-3 py-2">{i.counterparty || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{i.reference_no || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{i.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
