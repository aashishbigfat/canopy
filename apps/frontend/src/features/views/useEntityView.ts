"use client";

import { useCallback, useEffect, useState } from "react";
import {
  entityViewsService,
  type EntityView,
  type EntityViewIn,
  type PinnedView,
} from "@/lib/api/services/entity-views.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";

export function useEntityView(entity: EntityType) {
  const [views, setViews] = useState<EntityView[]>([]);
  const [pinned, setPinned] = useState<PinnedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([
        entityViewsService.listViews(entity),
        entityViewsService.listPinned(entity),
      ]);
      setViews(v);
      setPinned(p);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) ?? null : null;

  const createView = async (payload: EntityViewIn) => {
    const v = await entityViewsService.createView(entity, payload);
    setViews((arr) => [v, ...arr]);
    return v;
  };

  const updateView = async (id: string, payload: Partial<EntityViewIn>) => {
    const v = await entityViewsService.updateView(entity, id, payload);
    setViews((arr) => arr.map((x) => (x.id === id ? v : x)));
    return v;
  };

  const deleteView = async (id: string) => {
    await entityViewsService.deleteView(entity, id);
    setViews((arr) => arr.filter((x) => x.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  };

  const pin = async (viewId: string) => {
    await entityViewsService.pin(entity, viewId);
    await reload();
  };

  const unpin = async (viewId: string) => {
    await entityViewsService.unpin(entity, viewId);
    setPinned((arr) => arr.filter((p) => p.view_id !== viewId));
  };

  const isPinned = (viewId: string) => pinned.some((p) => p.view_id === viewId);

  return {
    views,
    pinned,
    activeViewId,
    activeView,
    setActiveViewId,
    loading,
    reload,
    createView,
    updateView,
    deleteView,
    pin,
    unpin,
    isPinned,
  };
}
