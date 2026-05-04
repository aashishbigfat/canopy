"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  usersExtraService,
  type DirectoryEntry,
} from "@/lib/api/services/users-extra.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function DirectoryPage() {
  const [rows, setRows] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    usersExtraService
      .directory()
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

  const filtered = rows.filter(
    (r) =>
      !q ||
      (r.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (r.email || "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">User Directory</h1>
        <p className="text-sm text-muted-foreground">Active users in your tenant.</p>
      </div>
      <Input
        placeholder="Search by name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarFallback>
                {(u.name || u.email)
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{u.name || "—"}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              {u.designation && (
                <div className="text-xs text-muted-foreground">{u.designation}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
