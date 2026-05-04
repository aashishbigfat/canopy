"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usersExtraService, type LoginLog } from "@/lib/api/services/users-extra.service";
import { Loader2 } from "lucide-react";

export default function LoginLogsPage() {
  const [rows, setRows] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersExtraService
      .loginLogs(undefined, 200)
      .then(setRows)
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Login logs</h1>
        <p className="text-sm text-muted-foreground">Last 200 login events for this tenant.</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No login logs.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Logged in</th>
                <th className="px-3 py-2">Logged out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs">{l.user_id || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.ip_address || "—"}</td>
                  <td className="px-3 py-2">
                    {l.logged_in_at ? new Date(l.logged_in_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {l.logged_out_at ? new Date(l.logged_out_at).toLocaleString() : "—"}
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
