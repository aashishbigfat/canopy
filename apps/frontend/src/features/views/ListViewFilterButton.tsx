"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntityType } from "@/lib/api/services/field-registry.service";
import { useEntityViews } from "./useEntityViews";
import { EditListFiltersDialog } from "./EditListFiltersDialog";
import type { OptionList } from "./accountFields";

/**
 * View-aware Filter button. On a system preset (no saved view) it is disabled —
 * filtering is a property of a saved view. On a saved view it opens "Edit List
 * Filters" (create the view's filters if none yet, or edit/apply existing ones).
 */
export function ListViewFilterButton({
  entity,
  lookupOptions,
}: {
  entity: EntityType;
  lookupOptions?: Record<string, OptionList>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeView } = useEntityViews(entity);
  const [open, setOpen] = React.useState(false);

  const hasFilters = !!(activeView?.filter_rules && activeView.filter_rules.length);

  return (
    <>
      <Button
        variant={hasFilters ? "default" : "outline"}
        size="icon"
        className="flex-shrink-0"
        title={activeView ? "Edit list filters" : "Select a saved view to filter"}
        disabled={!activeView}
        onClick={() => activeView && setOpen(true)}
      >
        <Filter className="h-4 w-4" />
      </Button>

      {activeView && open && (
        <EditListFiltersDialog
          open={open}
          onOpenChange={setOpen}
          entity={entity}
          view={activeView}
          lookupOptions={lookupOptions}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["entity-views", entity] });
            router.refresh();
          }}
        />
      )}
    </>
  );
}
