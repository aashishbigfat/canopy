"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Route } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBDVisits } from "@/features/bd/visits/api/useBDVisits";
import { VisitFormDialog } from "@/features/bd/visits/components/VisitFormDialog";
import type { BDVisitStatus, BDVisitApprovalStatus } from "@/features/bd/visits/types";

const STATUS_OPTIONS: Array<BDVisitStatus | "all"> = [
  "all", "planned", "approved", "in_progress", "completed", "cancelled", "no_show",
];

const APPROVAL_OPTIONS: Array<BDVisitApprovalStatus | "all"> = [
  "all", "pending", "approved", "rejected", "not_required",
];

function statusBadge(status: BDVisitStatus): { variant: "default" | "outline" | "secondary"; className: string } {
  switch (status) {
    case "approved": return { variant: "outline", className: "border-emerald-500/40 text-emerald-500" };
    case "in_progress": return { variant: "outline", className: "border-blue-500/40 text-blue-500" };
    case "completed": return { variant: "outline", className: "border-emerald-700/40 text-emerald-700" };
    case "cancelled": return { variant: "outline", className: "border-red-500/40 text-red-500" };
    case "no_show": return { variant: "outline", className: "border-orange-500/40 text-orange-500" };
    default: return { variant: "outline", className: "border-slate-400/40 text-muted-foreground" };
  }
}

export default function VisitsListPage() {
  const [status, setStatus] = useState<BDVisitStatus | "all">("all");
  const [approval, setApproval] = useState<BDVisitApprovalStatus | "all">("all");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useBDVisits({
    status: status === "all" ? undefined : status,
    approval_status: approval === "all" ? undefined : approval,
    per_page: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={approval} onValueChange={(v) => setApproval(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPROVAL_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s === "all" ? "All approvals" : s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Schedule Visit
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (data?.visits.length ?? 0) === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No visits match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Scheduled</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Approval</th>
                <th className="px-3 py-2">BD Owner</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data!.visits.map((v) => {
                const sb = statusBadge(v.status);
                return (
                  <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/bd/visits/${v.id}`} className="hover:underline">{v.title}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{v.activity_type_name || "—"}</td>
                    <td className="px-3 py-2">{new Date(v.scheduled_date).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <Badge variant={sb.variant} className={`capitalize ${sb.className}`}>
                        {v.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">
                      {v.approval_status.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2">{v.owner_name || "—"}</td>
                    <td className="px-3 py-2">
                      {v.status === "completed" && (
                        <Link href={`/bd/tracking/route?visitId=${v.id}`} title="View route map">
                          <Route className="h-4 w-4 text-muted-foreground hover:text-emerald-500 transition-colors" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      <VisitFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
