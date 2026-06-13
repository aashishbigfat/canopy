"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  autoAssignService,
  type AutoAssignSettings,
  type CountryUserAssignment,
  type UserAssignmentRule,
} from "@/lib/api/services/admin-settings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function AutoAssignmentPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auto-Assignment</h1>
        <p className="text-sm text-muted-foreground">
          Round-robin, weighted, or country-wise lead routing rules.
        </p>
      </div>
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="users">Per-user rules</TabsTrigger>
          <TabsTrigger value="countries">Country routing</TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="countries">
          <CountriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsTab() {
  const [data, setData] = useState<AutoAssignSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    autoAssignService.getSettings().then(setData).catch(() => toast.error("Load failed"));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          checked={!!data.is_enabled}
          onCheckedChange={(v: boolean) => setData({ ...data, is_enabled: v })}
        />
        <Label>Enable auto-assignment</Label>
      </div>
      <div>
        <Label>Strategy</Label>
        <Select
          value={data.strategy || "round_robin"}
          onValueChange={(v) => setData({ ...data, strategy: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="round_robin">Round robin</SelectItem>
            <SelectItem value="weighted">Weighted</SelectItem>
            <SelectItem value="country_wise">Country-wise</SelectItem>
            <SelectItem value="department_wise">Department-wise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Cron expression (optional)</Label>
        <Input
          placeholder="e.g. */15 * * * *"
          value={data.cron_expression || ""}
          onChange={(e) => setData({ ...data, cron_expression: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={async () => {
            setSaving(true);
            try {
              await autoAssignService.saveSettings(data);
              toast.success("Saved");
            } catch {
              toast.error("Save failed");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const [rules, setRules] = useState<UserAssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRules(await autoAssignService.listUserRules());
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        No per-user rules defined yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2">User ID</th>
            <th className="px-3 py-2">Active</th>
            <th className="px-3 py-2">Weight</th>
            <th className="px-3 py-2">Daily cap</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs">{r.user_id}</td>
              <td className="px-3 py-2">{r.is_active ? "Yes" : "No"}</td>
              <td className="px-3 py-2">{r.weight}</td>
              <td className="px-3 py-2">{r.daily_cap ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await autoAssignService.deleteUserRule(r.user_id);
                    await load();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountriesTab() {
  const [rows, setRows] = useState<CountryUserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [userIds, setUserIds] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await autoAssignService.listCountries());
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!country || !userIds) return;
    try {
      await autoAssignService.upsertCountry({
        country,
        user_ids: userIds.split(",").map((s) => s.trim()).filter(Boolean),
        is_active: true,
      });
      setCountry("");
      setUserIds("");
      await load();
    } catch {
      toast.error("Add failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IN, US, …" />
        </div>
        <div className="sm:col-span-2">
          <Label>User IDs (comma-separated)</Label>
          <Input value={userIds} onChange={(e) => setUserIds(e.target.value)} />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <Button onClick={add}>
            <Plus className="mr-1 h-4 w-4" />
            Add / update
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Users</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{r.country}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.user_ids.length}</td>
                  <td className="px-3 py-2">{r.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await autoAssignService.deleteCountry(r.country);
                        await load();
                      }}
                    >
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
