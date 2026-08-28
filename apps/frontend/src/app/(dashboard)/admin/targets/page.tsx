"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  usersExtraService,
  type UserTargetRow,
} from "@/lib/api/services/users-extra.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function TargetsPage() {
  const [rows, setRows] = useState<UserTargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, number>>({});

  useEffect(() => {
    usersExtraService
      .listTargets()
      .then(setRows)
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, []);

  async function saveAll() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const entries = Object.entries(edits);
    if (entries.length === 0) return toast.error("No changes");
    try {
      for (const [userId, target] of entries) {
        await usersExtraService.setCurrentTarget(userId, target, year, month);
      }
      toast.success(`Saved ${entries.length} targets`);
      setEdits({});
      setLoading(true);
      const fresh = await usersExtraService.listTargets();
      setRows(fresh);
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Targets</h1>
          <p className="text-sm text-muted-foreground">Set monthly target per user.</p>
        </div>
        <Button onClick={saveAll} disabled={Object.keys(edits).length === 0}>
          Save changes
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No users.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-right">Annual target</th>
                <th className="px-3 py-2 text-right">Current month</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                  <td className="px-3 py-2 text-right">{r.annual_target.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      defaultValue={r.current_target}
                      className="ml-auto w-32"
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [r.user_id]: Number(e.target.value) }))
                      }
                    />
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
