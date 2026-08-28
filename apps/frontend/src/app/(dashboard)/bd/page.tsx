"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ListChecks, Calendar, Receipt } from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import {
  useMyTodayVisits,
  useMyPendingApprovals,
  useBDDashboardKpis,
} from "@/features/bd/visits/api/useBDVisits";
import { useExpenseSummary } from "@/features/bd/expenses/api/useExpenses";
import { useMounted } from "@/hooks/use-mounted";

export default function BDLandingPage() {
  const today = useMyTodayVisits();
  const approvals = useMyPendingApprovals();
  const kpis = useBDDashboardKpis();
  const expSummary = useExpenseSummary();
  const mounted = useMounted();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="My Visits Today"
          value={kpis.isLoading ? null : kpis.data?.today.total ?? 0}
          subtitle={kpis.data ? `${kpis.data.today.completed} completed` : undefined}
          icon={<MapPin className="h-4 w-4 text-primary" />}
          href="/bd/visits"
        />
        <KPICard
          title="Approvals I Owe"
          value={kpis.isLoading ? null : kpis.data?.approvals_owed.total ?? 0}
          subtitle={kpis.data ? `${kpis.data.approvals_owed.visits} visits · ${kpis.data.approvals_owed.expenses} expenses` : undefined}
          icon={<ListChecks className="h-4 w-4 text-amber-500" />}
          href="/bd/approvals"
        />
        <KPICard
          title="My Pending Expenses"
          value={kpis.isLoading ? null : kpis.data?.pending_expenses.count ?? 0}
          subtitle={kpis.data ? `₹ ${kpis.data.pending_expenses.amount.toLocaleString()}` : undefined}
          icon={<Receipt className="h-4 w-4 text-emerald-500" />}
          href="/bd/expenses"
        />
        <KPICard
          title="Total Expenses"
          value={expSummary.data ? `₹ ${expSummary.data.total_amount.toLocaleString()}` : "—"}
          subtitle="Lifetime"
          icon={<Calendar className="h-4 w-4 text-blue-500" />}
          href="/bd/expenses"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Visits this week</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : !kpis.data || kpis.data.week_chart.length === 0 ? (
              <div className="text-sm text-muted-foreground py-10 text-center">No visits this week.</div>
            ) : !mounted ? (
              <div className="h-[220px]" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={kpis.data.week_chart}>
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short" })} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {today.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (today.data?.visits.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No visits scheduled for today.
              </div>
            ) : (
              <ul className="divide-y">
                {today.data!.visits.map((v) => (
                  <li key={v.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <Link href={`/bd/visits/${v.id}`} className="font-medium hover:underline">
                        {v.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {v.activity_type_name || "Visit"} · {new Date(v.scheduled_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">{v.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title, value, icon, href, subtitle,
}: {
  title: string;
  value: number | string | null;
  icon: React.ReactNode;
  href: string;
  subtitle?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-primary transition">
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            {icon}
          </div>
          <p className="text-2xl font-semibold">
            {value === null ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
