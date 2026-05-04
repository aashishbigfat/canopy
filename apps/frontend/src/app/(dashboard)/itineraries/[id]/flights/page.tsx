"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  itineraryExtrasService,
  type ItineraryFlight,
} from "@/lib/api/services/itineraries-extra.service";
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
import { Loader2, Plus, Plane } from "lucide-react";

export default function ItineraryFlightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [items, setItems] = useState<ItineraryFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    itinerary_id: id,
    airline: "",
    flight_no: "",
    cabin_class: "Economy",
    from_city: "",
    to_city: "",
    pax: 1,
    cost: 0,
    currency: "INR",
    pnr: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await itineraryExtrasService.listFlights(id));
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function create() {
    try {
      await itineraryExtrasService.createFlight(draft);
      setOpen(false);
      setDraft({ ...draft, airline: "", flight_no: "", from_city: "", to_city: "", pnr: "" });
      await load();
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flights
          </h1>
          <p className="text-sm text-muted-foreground">Flights linked to this itinerary.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add flight
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add flight</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Airline</Label>
                  <Input
                    value={draft.airline}
                    onChange={(e) => setDraft({ ...draft, airline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Flight no.</Label>
                  <Input
                    value={draft.flight_no}
                    onChange={(e) => setDraft({ ...draft, flight_no: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>From city</Label>
                  <Input
                    value={draft.from_city}
                    onChange={(e) => setDraft({ ...draft, from_city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>To city</Label>
                  <Input
                    value={draft.to_city}
                    onChange={(e) => setDraft({ ...draft, to_city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Cabin</Label>
                  <Input
                    value={draft.cabin_class}
                    onChange={(e) => setDraft({ ...draft, cabin_class: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Pax</Label>
                  <Input
                    type="number"
                    value={draft.pax}
                    onChange={(e) => setDraft({ ...draft, pax: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>PNR</Label>
                  <Input
                    value={draft.pnr}
                    onChange={(e) => setDraft({ ...draft, pnr: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cost</Label>
                  <Input
                    type="number"
                    value={draft.cost}
                    onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Add</Button>
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
          No flights linked.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Airline / No.</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">PNR</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.airline || "—"}</div>
                    <div className="text-xs text-muted-foreground">{f.flight_no || ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    {f.from_city || "—"} → {f.to_city || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{f.cabin_class || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{f.pnr || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {f.cost ? `${f.currency} ${f.cost.toLocaleString()}` : "—"}
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
