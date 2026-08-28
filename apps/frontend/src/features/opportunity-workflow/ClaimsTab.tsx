"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  opportunityWorkflowService,
  type OpportunityClaim,
} from "@/lib/api/services/opportunity-workflow.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

export function ClaimsTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<OpportunityClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ claim_type: "general", description: "", amount: 0 });

  async function load() {
    setLoading(true);
    try {
      setItems(await opportunityWorkflowService.listClaims(opportunityId));
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

  async function raise() {
    try {
      await opportunityWorkflowService.raiseClaim(opportunityId, draft);
      setOpen(false);
      setDraft({ claim_type: "general", description: "", amount: 0 });
      await load();
      toast.success("Claim raised");
    } catch {
      toast.error("Raise failed");
    }
  }

  async function resolve(id: string, status: "approved" | "rejected" | "resolved") {
    try {
      await opportunityWorkflowService.resolveClaim(opportunityId, id, { status });
      await load();
    } catch {
      toast.error("Resolve failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Claims</h2>
          <p className="text-sm text-muted-foreground">Cancellations, refunds, disputes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Raise claim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise claim</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Type</Label>
                <Input
                  value={draft.claim_type}
                  onChange={(e) => setDraft({ ...draft, claim_type: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={raise}>Raise</Button>
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
          No claims.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="crm-table-header">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{c.claim_type}</td>
                  <td className="px-3 py-2 text-right font-medium">{c.amount?.toLocaleString() || "—"}</td>
                  <td className="px-3 py-2">{c.status}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-md truncate">
                    {c.description || "—"}
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {c.status === "open" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => resolve(c.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resolve(c.id, "rejected")}>
                          Reject
                        </Button>
                      </>
                    )}
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
