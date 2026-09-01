"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  Settings,
  Plus,
  Pencil,
  Share2,
  Filter,
  Columns3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  entityViewsService,
  type EntityView,
} from "@/lib/api/services/entity-views.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";
import { useEntityViews } from "./useEntityViews";
import { SaveViewDialog, type SaveViewMode } from "./SaveViewDialog";
import { EditListFiltersDialog } from "./EditListFiltersDialog";
import { SelectFieldsDialog } from "./SelectFieldsDialog";
import type { OptionList } from "./accountFields";

export interface ViewPreset {
  label: string;
  value: string;
}

// Select a saved view (view_id) and clear any active preset (view).
function useSelectView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("view_id", id);
      else params.delete("view_id");
      params.delete("view");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );
}

/** Left-side view selector: system presets (the `view` param) + saved views. */
export function ListViewSelector({
  entity,
  presetLabel = "Recently Viewed",
  presets,
  className,
}: {
  entity: EntityType;
  presetLabel?: string;
  presets?: ViewPreset[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { views, activeView, activeViewId } = useEntityViews(entity);
  const selectView = useSelectView();

  const currentPreset = searchParams.get("view");
  const selectPreset = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("view", value);
    else params.delete("view");
    params.delete("view_id");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const activePresetLabel = presets?.find((p) => p.value === currentPreset)?.label;
  const buttonLabel = activeView ? activeView.name : activePresetLabel || presetLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary sm:text-lg"
          }
          title="Switch list view"
        >
          {buttonLabel}
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-60 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Presets</DropdownMenuLabel>
        {presets && presets.length > 0 ? (
          presets.map((p) => (
            <DropdownMenuItem
              key={p.value}
              onClick={() => selectPreset(p.value)}
              className={!activeView && currentPreset === p.value ? "font-semibold text-primary" : ""}
            >
              {p.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem
            onClick={() => selectView(null)}
            className={!activeView ? "font-semibold text-primary" : ""}
          >
            {presetLabel}
          </DropdownMenuItem>
        )}
        {views.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Saved views</DropdownMenuLabel>
            {views.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => selectView(v.id)}
                className={v.id === activeViewId ? "font-semibold text-primary" : ""}
              >
                {v.name}
                {v.is_public && <span className="ml-1 text-[10px] text-muted-foreground">(team)</span>}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Right-side context-aware Settings menu. On a system preset only "New" shows;
 * on a saved view the full set (New, Rename, Sharing Settings, Edit List Filters,
 * Select Fields to display, Delete) shows. `extra` injects module-specific items
 * (Refresh / Export / Import) above the view actions.
 */
export function ListViewSettings({
  entity,
  extra,
  lookupOptions,
  hideSelectFields = false,
}: {
  entity: EntityType;
  extra?: React.ReactNode;
  lookupOptions?: Record<string, OptionList>;
  /** Hide "Select Fields to display" for layouts without swappable columns (e.g. grouped/kanban). */
  hideSelectFields?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeView } = useEntityViews(entity);
  const selectView = useSelectView();

  const [saveMode, setSaveMode] = React.useState<SaveViewMode | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["entity-views", entity] });

  const onDelete = async () => {
    if (!activeView) return;
    if (!confirm(`Delete the view "${activeView.name}"?`)) return;
    try {
      await entityViewsService.deleteView(entity, activeView.id);
      toast.success("View deleted");
      invalidate();
      selectView(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete view");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex-shrink-0">
            <Settings className="mr-1 h-4 w-4" /> Settings <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {extra}
          {extra && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setSaveMode("new")}>
            <Plus className="mr-2 h-4 w-4" /> New
          </DropdownMenuItem>
          {activeView && (
            <>
              <DropdownMenuItem onClick={() => setSaveMode("rename")}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSaveMode("share")}>
                <Share2 className="mr-2 h-4 w-4" /> Sharing Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFiltersOpen(true)}>
                <Filter className="mr-2 h-4 w-4" /> Edit List Filters
              </DropdownMenuItem>
              {!hideSelectFields && (
                <DropdownMenuItem onClick={() => setFieldsOpen(true)}>
                  <Columns3 className="mr-2 h-4 w-4" /> Select Fields to display
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {saveMode && (
        <SaveViewDialog
          open={!!saveMode}
          onOpenChange={(o) => !o && setSaveMode(null)}
          entity={entity}
          mode={saveMode}
          view={activeView}
          onSaved={(v) => {
            setSaveMode(null);
            invalidate();
            selectView(v.id);
          }}
        />
      )}
      {activeView && filtersOpen && (
        <EditListFiltersDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          entity={entity}
          view={activeView}
          lookupOptions={lookupOptions}
          onSaved={() => {
            invalidate();
            router.refresh();
          }}
        />
      )}
      {activeView && fieldsOpen && (
        <SelectFieldsDialog
          open={fieldsOpen}
          onOpenChange={setFieldsOpen}
          entity={entity}
          view={activeView}
          onSaved={() => {
            invalidate();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
