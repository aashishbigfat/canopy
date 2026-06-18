"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  itineraryExtrasService,
  type ItineraryHotel,
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
import { Loader2, Plus, Hotel } from "lucide-react";

export default function ItineraryHotelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [items, setItems] = useState<ItineraryHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    itinerary_id: id,
    name: "",
    city: "",
    nights: 1,
    rooms: 1,
    pax: 2,
    cost: 0,
    currency: "INR",
    star_rating: 3,
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await itineraryExtrasService.listHotels(id));
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
    if (!draft.name) return toast.error("Name required");
    try {
      await itineraryExtrasService.createHotel(draft);
      setOpen(false);
      setDraft({ ...draft, name: "" });
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
            <Hotel className="h-5 w-5" />
            Hotels
          </h1>
          <p className="text-sm text-muted-foreground">Hotels linked to this itinerary.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add hotel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add hotel</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Star rating</Label>
                  <Input
                    type="number"
                    value={draft.star_rating}
                    onChange={(e) => setDraft({ ...draft, star_rating: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Nights</Label>
                  <Input
                    type="number"
                    value={draft.nights}
                    onChange={(e) => setDraft({ ...draft, nights: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Rooms</Label>
                  <Input
                    type="number"
                    value={draft.rooms}
                    onChange={(e) => setDraft({ ...draft, rooms: Number(e.target.value) })}
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
          No hotels linked.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Hotel</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Nights</th>
                <th className="px-3 py-2">Rooms / Pax</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{h.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{h.city || "—"}</td>
                  <td className="px-3 py-2">{h.nights || 0}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {h.rooms || 0} / {h.pax || 0}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {h.cost ? `${h.currency} ${h.cost.toLocaleString()}` : "—"}
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
