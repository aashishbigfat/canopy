"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { leaderboardService } from "@/lib/api/services/admin-settings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Param {
  metric: string;
  weight: number;
}

interface Accolade {
  name: string;
  threshold: number;
  emoji?: string;
}

export default function LeaderboardPage() {
  const [params, setParams] = useState<Param[]>([]);
  const [accolades, setAccolades] = useState<Accolade[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingP, setSavingP] = useState(false);
  const [savingA, setSavingA] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await leaderboardService.get();
        setParams((cfg.parameters as Param[]) || []);
        setAccolades((cfg.accolades as Accolade[]) || []);
      } catch {
        toast.error("Failed to load leaderboard config");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Configure scoring parameters and award badges (accolades).
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Parameters</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setParams((p) => [...p, { metric: "", weight: 1 }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {params.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Metric (e.g. closed_won_amount)"
                value={p.metric}
                onChange={(e) =>
                  setParams((arr) => arr.map((a, k) => (k === i ? { ...a, metric: e.target.value } : a)))
                }
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Weight"
                value={p.weight}
                onChange={(e) =>
                  setParams((arr) =>
                    arr.map((a, k) => (k === i ? { ...a, weight: Number(e.target.value) } : a)),
                  )
                }
                className="w-24"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParams((arr) => arr.filter((_, k) => k !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {params.length === 0 && (
            <div className="text-sm text-muted-foreground">No parameters defined.</div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              setSavingP(true);
              try {
                await leaderboardService.saveParameters(params);
                toast.success("Saved");
              } catch {
                toast.error("Save failed");
              } finally {
                setSavingP(false);
              }
            }}
            disabled={savingP}
          >
            {savingP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save parameters
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Accolades</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setAccolades((a) => [...a, { name: "", threshold: 0, emoji: "🏆" }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {accolades.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Emoji"
                value={a.emoji || ""}
                onChange={(e) =>
                  setAccolades((arr) =>
                    arr.map((x, k) => (k === i ? { ...x, emoji: e.target.value } : x)),
                  )
                }
                className="w-16"
              />
              <Input
                placeholder="Name (e.g. Top Performer)"
                value={a.name}
                onChange={(e) =>
                  setAccolades((arr) =>
                    arr.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)),
                  )
                }
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Threshold"
                value={a.threshold}
                onChange={(e) =>
                  setAccolades((arr) =>
                    arr.map((x, k) =>
                      k === i ? { ...x, threshold: Number(e.target.value) } : x,
                    ),
                  )
                }
                className="w-32"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAccolades((arr) => arr.filter((_, k) => k !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {accolades.length === 0 && (
            <div className="text-sm text-muted-foreground">No accolades defined.</div>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              setSavingA(true);
              try {
                await leaderboardService.saveAccolades(accolades);
                toast.success("Saved");
              } catch {
                toast.error("Save failed");
              } finally {
                setSavingA(false);
              }
            }}
            disabled={savingA}
          >
            {savingA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save accolades
          </Button>
        </div>
      </div>
    </div>
  );
}
