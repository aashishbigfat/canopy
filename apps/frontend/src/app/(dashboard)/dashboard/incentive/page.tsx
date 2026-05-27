"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  dashboardsExtraService,
  type UserIncentiveGroup,
  type UserIncentiveEntry,
} from "@/lib/api/services/dashboards-extra.service";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, IndianRupee } from "lucide-react";

function IncentiveTable({ records }: { records: UserIncentiveEntry["records"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2">Month</th>
            <th className="px-4 py-2">Opportunities / Profit (%)</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Sales Amount</th>
            <th className="px-4 py-2">Earn Rupees</th>
            <th className="px-4 py-2">Mature Rupees</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const oppLabel =
              r.total_opportunities === 0
                ? "0"
                : `${r.opportunities_won} / ${r.total_opportunities}`;
            const oppColor =
              r.opportunities_won === 0 ? "text-muted-foreground" : "text-green-400";
            return (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td className="px-4 py-2 font-medium text-foreground">{r.month_label}</td>
                <td className={cn("px-4 py-2 font-semibold", oppColor)}>{oppLabel}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {r.target > 0 ? r.target.toLocaleString("en-IN") : 0}
                </td>
                <td className="px-4 py-2 text-foreground">
                  {r.sales_amount > 0 ? r.sales_amount.toLocaleString("en-IN") : 0}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{r.earn_rupees}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.mature_rupees}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserAccordion({ user }: { user: UserIncentiveEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left bg-card hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-foreground">{user.name}</span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border bg-background/50">
          <IncentiveTable records={user.records} />
        </div>
      )}
    </div>
  );
}

function RoleGroup({ group }: { group: UserIncentiveGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 bg-accent/50 hover:bg-accent transition-colors"
      >
        <span className="font-semibold text-indigo-400">{group.role_name}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="divide-y divide-border p-3 space-y-2 bg-card">
          {group.users.map((u) => (
            <UserAccordion key={u.user_id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IncentivePage() {
  const { data: session } = useSession();

  const { data: userIncentive, isLoading: loadingUsers } = useQuery({
    queryKey: ["user-incentive-records", session?.user?.id ?? "anon"],
    queryFn: () => dashboardsExtraService.userIncentiveRecords(12),
    staleTime: 5 * 60 * 1000,
  });

  const { data: deptIncentive, isLoading: loadingDepts } = useQuery({
    queryKey: ["dept-incentive-records", session?.user?.id ?? "anon"],
    queryFn: () => dashboardsExtraService.departmentIncentiveRecords(12),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="crm-page">
      <h1 className="text-2xl font-bold text-foreground mb-6">Incentive Records</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users Incentive Records — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Purple header bar */}
          <div className="rounded-t-xl bg-indigo-600 px-6 py-3">
            <h2 className="text-base font-bold text-white">Users Incentive Records</h2>
          </div>

          {loadingUsers && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingUsers && (userIncentive?.groups?.length ?? 0) === 0 && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No incentive data available.</p>
            </div>
          )}

          {!loadingUsers &&
            userIncentive?.groups?.map((group) => (
              <RoleGroup key={group.role_name} group={group} />
            ))}
        </div>

        {/* Departments Incentive Records — 1/3 width */}
        <div className="space-y-4">
          {/* Blue header bar */}
          <div className="rounded-t-xl bg-blue-600 px-6 py-3">
            <h2 className="text-base font-bold text-white">Departments Incentive Records</h2>
          </div>

          {loadingDepts && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingDepts && (deptIncentive?.groups?.length ?? 0) === 0 && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No department data available.</p>
            </div>
          )}

          {!loadingDepts &&
            deptIncentive?.groups?.map((dept) => (
              <div
                key={dept.department_name}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <h3 className="font-semibold text-foreground">{dept.department_name}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  {dept.records.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{r.month_label}</span>
                      <span className="font-medium text-foreground">
                        {r.sales_amount > 0
                          ? r.sales_amount.toLocaleString("en-IN")
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
