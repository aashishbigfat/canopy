"use client";

import { useEffect, useRef, useState } from "react";
import { trackingService, PingPayload } from "@/lib/api/services/tracking.service";

/**
 * Foreground GPS tracker for a BD visit. While `enabled` is true, the browser
 * pushes `navigator.geolocation.watchPosition` callbacks into a local buffer
 * that is flushed to the backend every `flushIntervalMs`.
 *
 * Browsers severely limit background geolocation; for now this only works
 * while the tab is open / in focus. A native mobile companion can fix that.
 */
export function useLiveTracking({
  visitId,
  enabled,
  flushIntervalMs = 60_000,
}: {
  visitId?: string;
  enabled: boolean;
  flushIntervalMs?: number;
}) {
  const bufferRef = useRef<PingPayload[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastPushAt, setLastPushAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      bufferRef.current.push({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        recorded_at: new Date(pos.timestamp).toISOString(),
        bd_visit_id: visitId,
        accuracy_m: pos.coords.accuracy ?? undefined,
        speed_mps: pos.coords.speed ?? undefined,
        heading_deg: pos.coords.heading ?? undefined,
        altitude_m: pos.coords.altitude ?? undefined,
      });
    };
    const onErr = (err: GeolocationPositionError) => {
      setError(err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 15_000,
    });

    const flush = async () => {
      if (bufferRef.current.length === 0) return;
      const batch = bufferRef.current.splice(0, bufferRef.current.length);
      try {
        await trackingService.ingest(batch);
        setLastPushAt(new Date());
        setError(null);
      } catch (e: any) {
        // Re-queue if the network failed; drop on 4xx
        const status = e?.response?.status ?? 0;
        if (status >= 500 || status === 0) {
          bufferRef.current.unshift(...batch);
        }
        setError(e?.message || "Ping upload failed");
      }
    };

    flushTimerRef.current = setInterval(flush, flushIntervalMs);

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      // Best-effort final flush
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, visitId, flushIntervalMs]);

  return { lastPushAt, error, queued: bufferRef.current.length };
}
