"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import {
  itineraryDayService,
  type ItineraryDay,
} from "@/lib/api/services/itineraries-day.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Calendar } from "lucide-react";

export default function ItineraryBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await itineraryDayService.listDays(id);
      setDays(rows.sort((a, b) => a.day_number - b.day_number));
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

  function patchActive(patch: Partial<ItineraryDay>) {
    setDays((arr) => arr.map((d, i) => (i === activeIdx ? { ...d, ...patch } : d)));
  }

  async function saveDay() {
    const day = days[activeIdx];
    if (!day) return;
    setSaving(true);
    try {
      await itineraryDayService.updateDayDescriptions(id, day.id, {
        title: day.title,
        description: day.description || "",
      });
      toast.success("Day saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (days.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          This itinerary has no days yet. Create a new itinerary or add days.
        </div>
      </div>
    );
  }

  const active = days[activeIdx];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Day list rail */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 overflow-y-auto">
        <div className="border-b px-3 py-3 text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Days
        </div>
        <ul>
          {days.map((d, i) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                  i === activeIdx ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                }`}
              >
                <div className="font-medium">Day {d.day_number}</div>
                <div className={`truncate text-xs ${i === activeIdx ? "" : "text-muted-foreground"}`}>
                  {d.title || "(untitled)"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Day {active.day_number}</h1>
            <Button onClick={saveDay} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={active.title || ""}
                onChange={(e) => patchActive({ title: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={active.city || ""}
                onChange={(e) => patchActive({ city: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={6}
                value={active.description || ""}
                onChange={(e) => patchActive({ description: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Accommodation</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Hotel name</Label>
                <Input
                  value={active.hotel_name || ""}
                  onChange={(e) => patchActive({ hotel_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Meals</h2>
            <div className="flex flex-wrap items-center gap-6">
              {(["breakfast", "lunch", "dinner"] as const).map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <Switch
                    checked={active[m]}
                    onCheckedChange={(v: boolean) => patchActive({ [m]: v } as any)}
                  />
                  <Label className="capitalize">{m}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Transport</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Mode</Label>
                <Input
                  value={active.transport_mode || ""}
                  onChange={(e) => patchActive({ transport_mode: e.target.value })}
                  placeholder="Car / Flight / Train"
                />
              </div>
              <div>
                <Label>Details</Label>
                <Input
                  value={active.transport_details || ""}
                  onChange={(e) => patchActive({ transport_details: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
