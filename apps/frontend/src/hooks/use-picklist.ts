/**
 * usePicklist — Reusable hook for fetching dynamic picklist data.
 *
 * Replaces hardcoded <SelectItem> values across all forms by fetching
 * active picklist items from the centralized picklist API.
 *
 * Usage:
 *   const { items, loading } = usePicklist("salutation");
 *   // → items = [{ id: "...", name: "Mr.", ... }, ...]
 *
 * Features:
 * - Caches results per picklist type (no duplicate requests per page load)
 * - Only returns active items (backend filters by is_active=true)
 * - Sorted by backend sorting field
 */
import { useState, useEffect, useRef } from "react";
import { picklistsService, PicklistType, PicklistItem } from "@/lib/api/services/picklists.service";

// In-memory cache shared across all hook instances in the same page session
const cache: Partial<Record<PicklistType, PicklistItem[]>> = {};

export function usePicklist(type: PicklistType) {
  const [items, setItems] = useState<PicklistItem[]>(cache[type] ?? []);
  const [loading, setLoading] = useState(!cache[type]);
  const [error, setError] = useState<string | null>(null);

  // Avoid stale closures on unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Return cached immediately
    if (cache[type]) {
      setItems(cache[type]!);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await picklistsService.list(type);
        // Filter active only (backend should also filter, but double-safe)
        const active = data.filter((item) => item.is_active);
        cache[type] = active;

        if (!cancelled && mountedRef.current) {
          setItems(active);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load picklist");
          // Return empty on error — form still renders, just without options
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [type]);

  return { items, loading, error };
}

/**
 * Utility: invalidate the cache for a specific type.
 * Call this after an admin updates the picklist settings.
 */
export function invalidatePicklistCache(type?: PicklistType) {
  if (type) {
    delete cache[type];
  } else {
    for (const key of Object.keys(cache) as PicklistType[]) {
      delete cache[key];
    }
  }
}
