"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { itineraryExtrasService } from "@/lib/api/services/itineraries-extra.service";
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
import { Plus, Loader2, Copy } from "lucide-react";

export default function TourItinerariesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", total_days: 1, total_nights: 0, base_price: 0, currency: "INR" });

  async function load() {
    setLoading(true);
    try {
      setItems(await itineraryExtrasService.listTour());
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!draft.name) return toast.error("Name required");
    try {
      await itineraryExtrasService.createTour(draft);
      setOpen(false);
      setDraft({ name: "", total_days: 1, total_nights: 0, base_price: 0, currency: "INR" });
      await load();
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tour Itineraries</h1>
          <p className="text-sm text-muted-foreground">Reusable tour packages (legacy engine).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New tour
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New tour itinerary</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Days</Label>
                  <Input
                    type="number"
                    value={draft.total_days}
                    onChange={(e) => setDraft({ ...draft, total_days: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Nights</Label>
                  <Input
                    type="number"
                    value={draft.total_nights}
                    onChange={(e) => setDraft({ ...draft, total_nights: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Base price</Label>
                  <Input
                    type="number"
                    value={draft.base_price}
                    onChange={(e) => setDraft({ ...draft, base_price: Number(e.target.value) })}
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
          No tour itineraries yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-lg border p-4 space-y-2">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {t.total_days} day{t.total_days === 1 ? "" : "s"} / {t.total_nights} night{t.total_nights === 1 ? "" : "s"}
              </div>
              {t.base_price ? (
                <div className="text-sm">
                  From <span className="font-medium">{t.currency} {t.base_price.toLocaleString()}</span>
                </div>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await itineraryExtrasService.copyTour(t.id);
                  await load();
                  toast.success("Copied");
                }}
              >
                <Copy className="mr-1 h-3 w-3" />
                Duplicate
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
