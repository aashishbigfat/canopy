"use client";

import { useEffect, useId, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker images don't resolve via webpack — wire them up
// from the CDN so the markers actually render.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface RouteMapProps {
  polyline: [number, number][];
  startLabel?: string;
  endLabel?: string;
  targetMarker?: { lat: number; lng: number; label?: string } | null;
  height?: number;
}

function FitToRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export function RouteMap({
  polyline,
  startLabel = "Start",
  endLabel = "End",
  targetMarker,
  height = 480,
}: RouteMapProps) {
  // Unique key per component instance — forces React to destroy and recreate
  // the MapContainer when the component remounts (e.g. during HMR), preventing
  // the "Map container is being reused by another instance" Leaflet error.
  const mapKey = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup: on unmount, remove any leftover Leaflet map instance from the
  // DOM so a future mount doesn't collide with a stale instance.
  useEffect(() => {
    return () => {
      const el = containerRef.current;
      if (el) {
        const leafletEl = el.querySelector(".leaflet-container") as any;
        if (leafletEl?._leaflet_id) {
          try {
            leafletEl._leaflet?.remove?.();
          } catch {
            // best effort
          }
        }
      }
    };
  }, []);

  if (polyline.length === 0 && !targetMarker) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No route data yet.
      </div>
    );
  }

  const center = polyline.length > 0
    ? [polyline[0][0], polyline[0][1]]
    : targetMarker
      ? [targetMarker.lat, targetMarker.lng]
      : [0, 0];

  return (
    <div ref={containerRef} style={{ height }} className="rounded-md overflow-hidden border relative z-0">
      <MapContainer
        key={mapKey}
        center={center as [number, number]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polyline.length > 1 && (
          <Polyline positions={polyline} pathOptions={{ color: "#10b981", weight: 4 }} />
        )}
        {polyline.length > 0 && (
          <>
            <Marker position={polyline[0]}>
              <Popup>{startLabel}</Popup>
            </Marker>
            <Marker position={polyline[polyline.length - 1]}>
              <Popup>{endLabel}</Popup>
            </Marker>
          </>
        )}
        {targetMarker && (
          <Marker position={[targetMarker.lat, targetMarker.lng]}>
            <Popup>{targetMarker.label || "Target"}</Popup>
          </Marker>
        )}
        <FitToRoute points={polyline.length > 0 ? polyline : (targetMarker ? [[targetMarker.lat, targetMarker.lng]] : [])} />
      </MapContainer>
    </div>
  );
}
