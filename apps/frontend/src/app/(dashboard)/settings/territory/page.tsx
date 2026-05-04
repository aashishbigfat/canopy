"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { territoryService, type Region, type Territory } from "@/lib/api/services/territory.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function TerritoryPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Territory & Regions</h1>
        <p className="text-sm text-muted-foreground">
          Geographic hierarchy: regions → territories → countries / users.
        </p>
      </div>
      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
          <TabsTrigger value="bd">BD Report</TabsTrigger>
        </TabsList>
        <TabsContent value="regions">
          <RegionsTab />
        </TabsContent>
        <TabsContent value="territories">
          <TerritoriesTab />
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

  useEffect(() => {
    territoryService
      .listRegions()
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
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        No regions defined yet.
      </div>
    );
  }
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Parent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.code || "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.parent_id || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TerritoriesTab() {
  const [rows, setRows] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    territoryService
      .listTerritories()
      .then((d) => setRows(d.territories))
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
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        No territories defined yet.
      </div>
    );
  }
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Region</th>
            <th className="px-3 py-2">Countries</th>
            <th className="px-3 py-2">Users</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">{t.name}</td>
              <td className="px-3 py-2">{t.region_name || t.region_id}</td>
              <td className="px-3 py-2 text-muted-foreground">{t.countries.join(", ") || "—"}</td>
              <td className="px-3 py-2">{t.users.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="rounded-md border">
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
