"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  opportunityWorkflowService,
  type Voucher,
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
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";

const TYPES = ["general", "hotel", "flight", "activity", "transfer"] as const;

export function VouchersTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    voucher_type: "general",
    title: "",
    voucher_number: "",
    issued_to: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await opportunityWorkflowService.listVouchers(opportunityId));
    } catch {
      toast.error("Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  async function create() {
    try {
      await opportunityWorkflowService.createVoucher(opportunityId, draft);
      setOpen(false);
      setDraft({ voucher_type: "general", title: "", voucher_number: "", issued_to: "" });
      await load();
      toast.success("Voucher created");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Create failed");
    }
  }

  async function generate(id: string) {
    try {
      await opportunityWorkflowService.generateVoucher(opportunityId, id);
      await load();
      toast.success("Voucher issued");
    } catch {
      toast.error("Generate failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete voucher?")) return;
    await opportunityWorkflowService.deleteVoucher(opportunityId, id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vouchers</h2>
          <p className="text-sm text-muted-foreground">Booking vouchers tied to this opportunity.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New voucher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New voucher</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.voucher_type}
                  onValueChange={(v) => setDraft({ ...draft, voucher_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Voucher number</Label>
                <Input
                  value={draft.voucher_number}
                  onChange={(e) => setDraft({ ...draft, voucher_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Issued to</Label>
                <Input
                  value={draft.issued_to}
                  onChange={(e) => setDraft({ ...draft, issued_to: e.target.value })}
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
          No vouchers yet.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="crm-table-header">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{v.voucher_type}</td>
                  <td className="px-3 py-2">{v.title || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.voucher_number || "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        v.status === "issued"
                          ? "text-green-600"
                          : v.status === "cancelled"
                            ? "text-red-600"
                            : "text-muted-foreground"
                      }
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {v.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => generate(v.id)}>
                        <FileText className="mr-1 h-3 w-3" />
                        Issue
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
