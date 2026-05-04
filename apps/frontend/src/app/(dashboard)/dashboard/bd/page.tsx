"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { dashboardsExtraService } from "@/lib/api/services/dashboards-extra.service";
import { Loader2, TrendingUp, Calendar, DollarSign, Plane } from "lucide-react";

export default function BDDashboardPage() {
  const [today, setToday] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [tomorrow, setTomorrow] = useState<any>(null);
  const [stage, setStage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardsExtraService.bdToday(),
      dashboardsExtraService.bdTodayRevenue(),
      dashboardsExtraService.bdTomorrowDepartures(),
      dashboardsExtraService.bdStagePercentage(),
    ])
      .then(([t, r, tm, s]) => {
        setToday(t);
        setRevenue(r);
        setTomorrow(tm);
        setStage(s);
      })
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
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">BD Dashboard</h1>
        <p className="text-sm text-muted-foreground">Today, tomorrow, and stage breakdown for BD team.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card icon={<TrendingUp className="h-5 w-5 text-blue-600" />} title="Today opportunities" value={(today?.opportunities || []).length} />
        <Card icon={<DollarSign className="h-5 w-5 text-green-600" />} title="Today revenue" value={revenue?.revenue?.toLocaleString() || 0} />
        <Card icon={<Plane className="h-5 w-5 text-purple-600" />} title="Tomorrow departures" value={(tomorrow?.departures || []).length} />
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <h2 className="font-semibold">Stage breakdown</h2>
        </div>
        {stage?.stages?.length ? (
          <div className="space-y-2">
            {stage.stages.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-32 text-sm">{s.name}</div>
                <div className="flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${s.percentage || 0}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs text-muted-foreground">
                  {s.percentage || 0}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No stage data.</div>
        )}
      </div>
    </div>
  );
}

function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: any }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}
