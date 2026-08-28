"use client";

import { ViewBar } from "./ViewBar";
import type { EntityType } from "@/lib/api/services/field-registry.service";

/**
 * Drop-in toolbar for any entity list page.
 *
 * Usage:
 *   <EntityListToolbar
 *     entity="lead"
 *     currentFilters={filters}
 *     onViewChange={setFilters}
 *   />
 *
 * Renders: saved-views dropdown, save-current button.
 */
export function EntityListToolbar({
  entity,
  currentFilters,
  onViewChange,
  rightExtra,
}: {
  entity: EntityType;
  currentFilters?: Record<string, any>;
  onViewChange?: (filters: Record<string, any> | null) => void;
  rightExtra?: React.ReactNode;
}) {
  return (
    <div className="crm-toolbar justify-between">
      <ViewBar
        entity={entity}
        currentFilters={currentFilters}
        onViewChange={onViewChange}
      />
      {rightExtra && <div className="flex items-center gap-2">{rightExtra}</div>}
    </div>
  );
}
