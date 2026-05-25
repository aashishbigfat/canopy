"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Loader2, MapPin, Battery, RefreshCw, Radio, Navigation, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackingService, type TeamLocation } from "@/lib/api/services/tracking.service";
import { bdVisitsService } from "@/lib/api/services/bd-visits.service";

// Leaflet must be client-side only.
const RouteMap = dynamic(
  () => import("@/features/bd/tracking/components/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] rounded-md border flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
);

function ageString(iso: string): string {
  const ageSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (ageSec < 60) return `${Math.round(ageSec)}s ago`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
  return `${Math.round(ageSec / 3600)}h ago`;
}

interface InProgressVisit {
  id: string;
  title: string;
  owner_name?: string | null;
  status: string;
  check_in_at?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  scheduled_date: string;
  activity_type_name?: string | null;
}

export default function TrackingPage() {
  // Live team locations from GPS pings
  const [rows, setRows] = useState<TeamLocation[]>([]);
  // In-progress visits (from BD visits API) as fallback for map markers
  const [inProgressVisits, setInProgressVisits] = useState<InProgressVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAge, setMaxAge] = useState(30);

  const reload = async () => {
    try {
      // Fetch both live pings and in-progress visits in parallel
      const [liveData, visitsData] = await Promise.allSettled([
        trackingService.live(maxAge),
        bdVisitsService.list({ status: "in_progress", per_page: 50 }),
      ]);

      if (liveData.status === "fulfilled") {
        setRows(liveData.value);
      }

      if (visitsData.status === "fulfilled") {
        setInProgressVisits(visitsData.value.visits || []);
      }
    } catch {
      // permission denied → empty
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

  // Build map markers from live pings or fall back to check-in GPS from visits
  const mapMarkers: { lat: number; lng: number; label: string }[] = [];

  // First: real-time GPS pings
  for (const r of rows) {
    mapMarkers.push({
      lat: r.lat,
      lng: r.lng,
      label: `${r.user_name || "BD"} — ${r.bd_visit_title || "Active visit"} (${ageString(r.recorded_at)})`,
    });
  }

  // Second: in-progress visits with check-in GPS but no live pings
  const liveUserIds = new Set(rows.map((r) => r.user_id));
  for (const v of inProgressVisits) {
    if (v.check_in_lat && v.check_in_lng) {
      // Don't duplicate if already in live pings
      const ownerLive = rows.find((r) => r.bd_visit_id === v.id);
      if (!ownerLive) {
        mapMarkers.push({
          lat: v.check_in_lat,
          lng: v.check_in_lng,
          label: `${v.owner_name || "BD"} — ${v.title} (checked in at ${new Date(v.check_in_at!).toLocaleTimeString()})`,
        });
      }
    }
  }

  const hasMapData = mapMarkers.length > 0;
  const allItems = [
    ...rows.map((r) => ({
      key: r.user_id,
      type: "live" as const,
      name: r.user_name || r.user_id,
      visitId: r.bd_visit_id,
      visitTitle: r.bd_visit_title || "Active visit",
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy_m,
      battery: r.battery_pct,
      time: r.recorded_at,
    })),
    ...inProgressVisits
      .filter((v) => !rows.find((r) => r.bd_visit_id === v.id))
      .map((v) => ({
        key: v.id,
        type: "visit" as const,
        name: v.owner_name || "—",
        visitId: v.id,
        visitTitle: v.title,
        lat: v.check_in_lat,
        lng: v.check_in_lng,
        accuracy: null,
        battery: null,
        time: v.check_in_at || v.scheduled_date,
      })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-500" />
            Live Team Tracking
          </h2>
          <p className="text-xs text-muted-foreground">
            Shows all in-progress field visits with GPS locations. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      ) : (
        <>
          {/* Map */}
          {hasMapData ? (
            <Card>
              <CardContent className="p-0">
                <RouteMap
                  polyline={[]}
                  targetMarker={mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng, label: mapMarkers[0].label } : null}
                  height={400}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-3 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm font-medium">No active field visits right now</p>
                <p className="text-xs">
                  BDs will appear on this map when they check into a visit. GPS pings are streamed in real-time while the visit is in-progress.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Team list */}
          {allItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                In-Progress Visits ({allItems.length})
              </h3>
              {allItems.map((item) => (
                <Card key={item.key}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          {item.type === "live" ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </>
                          ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          )}
                        </span>
                        <p className="font-medium text-sm">{item.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type === "live" ? "Live GPS" : "Checked In"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.visitId && (
                          <>
                            <Link href={`/bd/visits/${item.visitId}`} className="hover:underline">
                              {item.visitTitle}
                            </Link>
                            {" · "}
                          </>
                        )}
                        {item.lat != null
                          ? `${item.lat.toFixed(5)}, ${item.lng?.toFixed(5)}`
                          : "No GPS yet"}
                        {item.accuracy != null && ` · ±${Math.round(item.accuracy)}m`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.battery != null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Battery className="h-3 w-3" /> {item.battery}%
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.time ? ageString(item.time) : "—"}
                      </Badge>
                      {item.visitId && (
                        <Link href={`/bd/visits/${item.visitId}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            <Navigation className="h-3 w-3 mr-1" /> View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
