"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  departmentMappingService,
  type DepartmentMapping,
} from "@/lib/api/services/admin-settings.service";
import { Loader2 } from "lucide-react";

export default function DepartmentMappingPage() {
  const [rows, setRows] = useState<DepartmentMapping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentMappingService
      .list()
      .then(setRows)
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Department Mapping</h1>
        <p className="text-sm text-muted-foreground">
          Department → users / products / destinations.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No mappings yet. Edit a department to add user / product / destination links.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Users</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2">Destinations</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs">{r.department_id}</td>
                  <td className="px-3 py-2">{r.user_ids.length}</td>
                  <td className="px-3 py-2">{r.product_ids.length}</td>
                  <td className="px-3 py-2">{r.destination_ids.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
