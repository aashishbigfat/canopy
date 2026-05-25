"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

// Leaflet must be client-side only.
const RouteMap = dynamic(
  () => import("@/features/bd/tracking/components/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="h-[480px] rounded-md border flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> },
);

interface RouteData {
  bd_visit_id: string;
  user_id: string;
  date: string;
  polyline: [number, number][];
  point_count_original: number;
  point_count_simplified: number;
  total_distance_km: number;
  total_duration_min: number;
  idle_minutes: number;
  started_at?: string | null;
  ended_at?: string | null;
}

export default function RoutePage() {
  const [visitId, setVisitId] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!visitId.trim()) return;
    setLoading(true);
    setNotFound(false);
    setRoute(null);
    try {
      const { data } = await apiClient.get(`/tracking/route/visit/${visitId.trim()}`);
      if (!data || (data.polyline || []).length === 0) {
        setNotFound(true);
      } else {
        setRoute(data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold">Visit Route Map</h2>
        <p className="text-xs text-muted-foreground">
          Visualises the BD&apos;s actual path during a completed visit. Routes are computed at check-out.
        </p>
      </div>

      <Card>
        <CardContent className="p-3 flex items-end gap-2">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="visit_id">BD Visit ID</Label>
            <Input
              id="visit_id"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              placeholder="Paste a completed visit's ObjectId"
            />
          </div>
          <Button onClick={load} disabled={loading || !visitId.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Load
          </Button>
        </CardContent>
      </Card>

      {notFound && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No route found for that visit (it may not be completed yet).
          </CardContent>
        </Card>
      )}

      {route && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Route Map</CardTitle>
            </CardHeader>
            <CardContent>
              <RouteMap polyline={route.polyline} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total Distance" value={`${route.total_distance_km.toFixed(2)} km`} />
            <Stat label="Total Duration" value={`${route.total_duration_min} min`} />
            <Stat label="Idle Time" value={`${route.idle_minutes} min`} />
            <Stat label="Polyline Points" value={`${route.point_count_simplified}/${route.point_count_original}`} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
