"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  opportunityWorkflowService,
  type Departure,
} from "@/lib/api/services/opportunity-workflow.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Plane, CalendarCheck } from "lucide-react";

export function DeparturesTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    departure_date: "",
    return_date: "",
    pax_count: 0,
    departure_city: "",
    return_city: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await opportunityWorkflowService.listDepartures(opportunityId));
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
    if (!draft.departure_date) {
      toast.error("Departure date required");
      return;
    }
    try {
      await opportunityWorkflowService.createDeparture(opportunityId, draft);
      setOpen(false);
      setDraft({ departure_date: "", return_date: "", pax_count: 0, departure_city: "", return_city: "", notes: "" });
      await load();
      toast.success("Departure created");
    } catch {
      toast.error("Create failed");
    }
  }

  async function book(id: string) {
    await opportunityWorkflowService.bookDeparture(opportunityId, id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Departures
          </h2>
          <p className="text-sm text-muted-foreground">Travel departures for this opportunity.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New departure</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Departure date</Label>
                <Input
                  type="date"
                  value={draft.departure_date}
                  onChange={(e) => setDraft({ ...draft, departure_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Return date</Label>
                <Input
                  type="date"
                  value={draft.return_date}
                  onChange={(e) => setDraft({ ...draft, return_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Pax count</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.pax_count}
                  onChange={(e) => setDraft({ ...draft, pax_count: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div>
                <Label>Departure city</Label>
                <Input
                  value={draft.departure_city}
                  onChange={(e) => setDraft({ ...draft, departure_city: e.target.value })}
                />
              </div>
              <div>
                <Label>Return city</Label>
                <Input
                  value={draft.return_city}
                  onChange={(e) => setDraft({ ...draft, return_city: e.target.value })}
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
          No departures.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="crm-table-header">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Return</th>
                <th className="px-3 py-2">Pax</th>
                <th className="px-3 py-2">From → To</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{d.departure_date.slice(0, 10)}</td>
                  <td className="px-3 py-2">{d.return_date ? d.return_date.slice(0, 10) : "—"}</td>
                  <td className="px-3 py-2">{d.pax_count}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {(d as any).departure_city || "—"} → {(d as any).return_city || "—"}
                  </td>
                  <td className="px-3 py-2">{d.status}</td>
                  <td className="px-3 py-2 text-right">
                    {d.status !== "booked" && (
                      <Button size="sm" variant="ghost" onClick={() => book(d.id)}>
                        <CalendarCheck className="mr-1 h-3 w-3" />
                        Book
                      </Button>
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
