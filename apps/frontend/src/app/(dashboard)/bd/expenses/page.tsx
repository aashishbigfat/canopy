"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useExpenses, useExpenseSummary } from "@/features/bd/expenses/api/useExpenses";
import { ExpenseFormDialog } from "@/features/bd/expenses/components/ExpenseFormDialog";
import type { ExpenseStatus } from "@/features/bd/expenses/types";

const STATUS_OPTIONS: Array<ExpenseStatus | "all"> = [
  "all", "draft", "submitted", "approved", "rejected", "reimbursed",
];

function statusClass(s: ExpenseStatus): string {
  switch (s) {
    case "draft": return "text-muted-foreground border-border";
    case "submitted": return "text-amber-500 border-amber-500/40";
    case "approved": return "text-emerald-500 border-emerald-500/40";
    case "rejected": return "text-red-500 border-red-500/40";
    case "reimbursed": return "text-blue-500 border-blue-500/40";
  }
}

export default function ExpensesListPage() {
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useExpenses({
    status: status === "all" ? undefined : status,
    per_page: 100,
  });
  const summary = useExpenseSummary();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SummaryCard label="My total" value={summary.data ? `₹${summary.data.total_amount.toLocaleString()}` : "—"} />
        <SummaryCard label="Pending" value={summary.data ? `₹${(summary.data.by_status.submitted ?? 0).toLocaleString()}` : "—"} />
        <SummaryCard label="Reimbursed" value={summary.data ? `₹${(summary.data.by_status.reimbursed ?? 0).toLocaleString()}` : "—"} />
        <SummaryCard label="Awaiting my approval" value={summary.data?.count_pending_approval ?? "—"} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Expense
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (data?.expenses.length ?? 0) === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No expenses match these filters.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Visit</th>
              </tr>
            </thead>
            <tbody>
              {data!.expenses.map((e) => (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/bd/expenses/${e.id}`} className="hover:underline">{e.title}</Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.category_name || "—"}</td>
                  <td className="px-3 py-2">{new Date(e.incurred_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{e.currency} {e.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={`capitalize ${statusClass(e.status)}`}>
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {e.bd_visit_title ? (
                      <Link href={`/bd/visits/${e.bd_visit_id}`} className="hover:underline">{e.bd_visit_title}</Link>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <ExpenseFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
