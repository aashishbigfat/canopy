"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  searchExtrasService,
  type SearchModuleConfig,
} from "@/lib/api/services/search-extras.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";

const ALL_MODULES = [
  "lead",
  "account",
  "contact",
  "opportunity",
  "supplier",
  "personal_account",
  "task",
  "itinerary",
  "file",
  "report",
];

export default function SearchModulesPage() {
  const [data, setData] = useState<SearchModuleConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    searchExtrasService
      .getModules()
      .then(setData)
      .catch(() => toast.error("Load failed"));
  }, []);

  if (!data)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  function toggle(mod: string) {
    setData((d) => {
      if (!d) return d;
      const enabled = d.enabled_modules.includes(mod);
      return {
        ...d,
        enabled_modules: enabled
          ? d.enabled_modules.filter((m) => m !== mod)
          : [...d.enabled_modules, mod],
      };
    });
  }

  function setWeight(mod: string, weight: number) {
    setData((d) =>
      d
        ? { ...d, weights: { ...(d.weights || {}), [mod]: weight } }
        : d,
    );
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await searchExtrasService.saveModules(data);
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Search modules</h1>
          <p className="text-sm text-muted-foreground">
            Toggle which modules global search covers and tune relevance weights.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-1 h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {ALL_MODULES.map((m) => (
          <div key={m} className="flex items-center gap-3 p-3">
            <Switch
              checked={data.enabled_modules.includes(m)}
              onCheckedChange={() => toggle(m)}
            />
            <div className="flex-1">
              <Label className="capitalize">{m.replace("_", " ")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">weight</span>
              <Input
                type="number"
                min={0}
                max={10}
                value={(data.weights || {})[m] ?? 1}
                onChange={(e) => setWeight(m, Number(e.target.value))}
                className="w-20"
                disabled={!data.enabled_modules.includes(m)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
