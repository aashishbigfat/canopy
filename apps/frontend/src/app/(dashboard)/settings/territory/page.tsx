"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { territoryService, type Region, type Territory } from "@/lib/api/services/territory.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegionFormDialog } from "@/features/bd/settings/components/RegionFormDialog";
import { TerritoryFormDialog } from "@/features/bd/settings/components/TerritoryFormDialog";
import { TerritoryAssignmentTester } from "@/features/bd/settings/components/TerritoryAssignmentTester";

export default function TerritoryPage() {
  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Territory & Regions</h1>
        <p className="text-sm text-muted-foreground">
          Geographic hierarchy that drives BD auto-assignment. A lead&apos;s address resolves to one
          territory, which selects the BD owner. Their manager (via role hierarchy) becomes the
          reporting manager / approver.
        </p>
      </div>
      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
          <TabsTrigger value="tester">Assignment Tester</TabsTrigger>
          <TabsTrigger value="bd">BD Report</TabsTrigger>
        </TabsList>
        <TabsContent value="regions">
          <RegionsTab />
        </TabsContent>
        <TabsContent value="territories">
          <TerritoriesTab />
        </TabsContent>
        <TabsContent value="tester">
          <TerritoryAssignmentTester />
        </TabsContent>
        <TabsContent value="bd">
          <BdTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RegionsTab() {
  const [rows, setRows] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Region | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    territoryService
      .listRegions()
      .then(setRows)
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await territoryService.deleteRegion(deleteId);
      toast.success("Region deleted");
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Region
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No regions defined yet. Click &ldquo;New Region&rdquo; to start.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Parent</th>
                <th className="px-3 py-2 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.code || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {rows.find((x) => x.id === r.parent_id)?.name || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RegionFormDialog
        open={open}
        onOpenChange={setOpen}
        region={editing}
        regions={rows}
        onSaved={reload}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete region?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Territories under this region will become orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TerritoriesTab() {
  const [rows, setRows] = useState<Territory[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Territory | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        territoryService.listTerritories(),
        territoryService.listRegions(),
      ]);
      setRows(t.territories);
      setRegions(r);
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await territoryService.deleteTerritory(deleteId);
      toast.success("Territory deleted");
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Territory
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No territories defined yet. Click &ldquo;New Territory&rdquo; to start.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Geo Match</th>
                <th className="px-3 py-2">BD Users</th>
                <th className="px-3 py-2 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.region_name || t.region_id}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {[
                      t.countries.length && `${t.countries.length} country`,
                      t.states.length && `${t.states.length} state`,
                      t.postal_codes?.length && `${t.postal_codes.length} zip`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">{t.users.length}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TerritoryFormDialog
        open={open}
        onOpenChange={setOpen}
        territory={editing}
        regions={regions}
        onSaved={reload}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete territory?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Existing leads will keep their territory_id pointer but no
              new leads will be auto-assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BdTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    territoryService
      .getBdReportList()
      .then(setRows)
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        No BD activity yet.
      </div>
    );
  }
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2">Territory</th>
            <th className="px-3 py-2">Users</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">{r.user_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
