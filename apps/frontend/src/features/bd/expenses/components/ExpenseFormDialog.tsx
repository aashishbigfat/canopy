"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { usePicklist } from "@/hooks/use-picklist";
import { useCreateExpense, useUpdateExpense } from "../api/useExpenses";
import type { Expense, ExpenseCreateData } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense?: Expense | null;
  defaults?: Partial<ExpenseCreateData>;
  onSaved?: () => void;
}

function toDateInput(iso?: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export function ExpenseFormDialog({ open, onOpenChange, expense, defaults, onSaved }: Props) {
  const { items: categories } = usePicklist("expense_category");
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("INR");
  const [incurredAt, setIncurredAt] = useState(toDateInput(null));
  const [description, setDescription] = useState("");
  const [bdVisitId, setBdVisitId] = useState("");

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setCategoryId(expense.category_id || "");
      setAmount(String(expense.amount));
      setCurrency(expense.currency);
      setIncurredAt(toDateInput(expense.incurred_at));
      setDescription(expense.description || "");
      setBdVisitId(expense.bd_visit_id || "");
    } else {
      setTitle(defaults?.title || "");
      setCategoryId(defaults?.category_id || "");
      setAmount(defaults?.amount ? String(defaults.amount) : "");
      setCurrency(defaults?.currency || "INR");
      setIncurredAt(toDateInput(defaults?.incurred_at || null));
      setDescription(defaults?.description || "");
      setBdVisitId(defaults?.bd_visit_id || "");
    }
  }, [expense, defaults, open]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Amount must be greater than 0");
    if (!incurredAt) return toast.error("Date is required");

    const payload = {
      title: title.trim(),
      amount: amt,
      currency,
      incurred_at: new Date(incurredAt).toISOString(),
      category_id: categoryId || undefined,
      description: description.trim() || undefined,
      bd_visit_id: bdVisitId || undefined,
    };

    try {
      if (expense) {
        await update.mutateAsync({ id: expense.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      /* toast handled by hook */
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            Drafts let you add receipts before submitting. After submit, your manager approves.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cab to client meeting" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.auto_approve_under != null && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (auto ≤ {c.auto_approve_under})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date *</Label>
              <Input type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5 col-span-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          {!expense && (
            <div className="grid gap-1.5">
              <Label>Link to BD Visit (optional)</Label>
              <Input
                value={bdVisitId}
                placeholder="Visit ObjectId"
                onChange={(e) => setBdVisitId(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {expense ? "Save" : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
