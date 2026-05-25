"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, ArrowLeft, Route, CalendarDays, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";
import { bdVisitsService } from "@/lib/api/services/bd-visits.service";

// Leaflet must be client-side only.
const RouteMap = dynamic(
  () => import("@/features/bd/tracking/components/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] rounded-md border flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
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

interface CompletedVisit {
  id: string;
  title: string;
  owner_name?: string | null;
  scheduled_date: string;
  activity_type_name?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
}

export default function RoutePage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("visitId");

  const [completedVisits, setCompletedVisits] = useState<CompletedVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(preselectedId || "");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Load completed visits for the dropdown
  useEffect(() => {
    bdVisitsService
      .list({ status: "completed", per_page: 50 })
      .then((data) => {
        setCompletedVisits(data.visits || []);
      })
      .catch(() => {})
      .finally(() => setLoadingVisits(false));
  }, []);

  // Auto-load route when a visitId is preselected (from visit detail page)
  useEffect(() => {
    if (preselectedId) {
      setSelectedId(preselectedId);
      loadRoute(preselectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedId]);

  const loadRoute = async (visitId: string) => {
    if (!visitId) return;
    setLoading(true);
    setNotFound(false);
    setRoute(null);
    try {
      const { data } = await apiClient.get(`/tracking/route/visit/${visitId}`);
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

  const selectedVisit = completedVisits.find((v) => v.id === selectedId);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/bd/tracking">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Route className="h-5 w-5 text-emerald-500" />
            Visit Route Map
          </h2>
          <p className="text-xs text-muted-foreground">
            View the actual GPS path a BD executive traveled during a completed visit.
          </p>
        </div>
      </div>

      {/* Visit Selector */}
      <Card>
        <CardContent className="p-4 flex items-end gap-3">
          <div className="flex-1 grid gap-1.5">
            <p className="text-sm font-medium">Select a completed visit</p>
            {loadingVisits ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading visits…
              </div>
            ) : completedVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No completed visits found. Complete a visit first.
              </p>
            ) : (
              <Select
                value={selectedId}
                onValueChange={(id) => {
                  setSelectedId(id);
                  loadRoute(id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a visit…" />
                </SelectTrigger>
                <SelectContent>
                  {completedVisits.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{v.title}</span>
                        <span className="text-xs text-muted-foreground">
                          · {v.owner_name || "—"} · {new Date(v.scheduled_date).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected visit info */}
      {selectedVisit && (
        <Card className="bg-muted/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3.5 w-3.5" /> {selectedVisit.owner_name || "—"}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> {new Date(selectedVisit.scheduled_date).toLocaleDateString()}
              </span>
              {selectedVisit.activity_type_name && (
                <Badge variant="outline" className="text-xs">{selectedVisit.activity_type_name}</Badge>
              )}
              {selectedVisit.check_in_at && selectedVisit.check_out_at && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(selectedVisit.check_in_at).toLocaleTimeString()} → {new Date(selectedVisit.check_out_at).toLocaleTimeString()}
                </span>
              )}
            </div>
            <Link href={`/bd/visits/${selectedVisit.id}`}>
              <Button variant="outline" size="sm" className="text-xs">View Visit</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* Not found */}
      {notFound && (
        <Card>
          <CardContent className="py-12 text-center space-y-2 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm font-medium">No route data for this visit</p>
            <p className="text-xs">
              GPS route data is recorded in real-time while a BD is checked into a visit.
              If no route appears, the BD may not have had GPS enabled or the visit was completed too quickly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Route Map + Stats */}
      {route && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="h-4 w-4 text-emerald-500" /> Route Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RouteMap polyline={route.polyline} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total Distance" value={`${route.total_distance_km.toFixed(2)} km`} />
            <Stat label="Total Duration" value={`${route.total_duration_min} min`} />
            <Stat label="Idle Time" value={`${route.idle_minutes} min`} />
            <Stat label="GPS Points" value={`${route.point_count_simplified} / ${route.point_count_original}`} />
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

function MapPin(props: React.SVGAttributes<SVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
