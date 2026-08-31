"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  entityViewsService,
  type EntityView,
} from "@/lib/api/services/entity-views.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";

/**
 * Shared saved-view state for a list module. The active view is the `view_id`
 * URL param (a saved EntityView); when absent the list is on a system preset
 * (e.g. "Recently Viewed"). React Query dedupes the fetch across the ListViewMenu
 * and the table that consumes the active view's display_columns.
 */
export function useEntityViews(entity: EntityType) {
  const searchParams = useSearchParams();
  const activeViewId = searchParams.get("view_id") || null;

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["entity-views", entity],
    queryFn: () => entityViewsService.listViews(entity),
    staleTime: 60_000,
  });

  const activeView: EntityView | null =
    views.find((v) => v.id === activeViewId) || null;

  return { views, activeView, activeViewId, isLoading };
}
