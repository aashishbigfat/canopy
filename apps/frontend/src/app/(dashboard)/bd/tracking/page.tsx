"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Battery, RefreshCw, Map as MapIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackingService, type TeamLocation } from "@/lib/api/services/tracking.service";

function ageString(iso: string): string {
  const ageSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (ageSec < 60) return `${Math.round(ageSec)}s ago`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
  return `${Math.round(ageSec / 3600)}h ago`;
}

export default function TrackingPage() {
  const [rows, setRows] = useState<TeamLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAge, setMaxAge] = useState(10);

  const reload = async () => {
    try {
      const data = await trackingService.live(maxAge);
      setRows(data);
    } catch {
      // permission denied → empty list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAge]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Live Team Locations</h2>
          <p className="text-xs text-muted-foreground">
            Only BDs with an active visit (and the tab open) appear here. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/bd/tracking/route" className="text-sm">
            <Button size="sm" variant="outline"><MapIcon className="h-3.5 w-3.5 mr-1" /> Route Map</Button>
          </Link>
          <select
            className="text-sm border rounded px-2 py-1 bg-background"
            value={maxAge}
            onChange={(e) => setMaxAge(parseInt(e.target.value, 10))}
          >
            <option value={5}>Last 5 min</option>
            <option value={10}>Last 10 min</option>
            <option value={30}>Last 30 min</option>
            <option value={60}>Last hour</option>
          </select>
          <Button size="sm" variant="outline" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto opacity-50" />
            <p className="text-sm">No active BDs in the last {maxAge} minutes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.user_id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.user_name || r.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.bd_visit_id ? (
                      <>
                        <Link href={`/bd/visits/${r.bd_visit_id}`} className="hover:underline">
                          {r.bd_visit_title || "Visit"}
                        </Link>
                        {" · "}
                      </>
                    ) : null}
                    {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                    {r.accuracy_m && ` · ±${Math.round(r.accuracy_m)}m`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.battery_pct != null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Battery className="h-3 w-3" /> {r.battery_pct}%
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">{ageString(r.recorded_at)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
