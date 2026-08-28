"use client";

import { useState } from "react";
import { toast } from "sonner";
import { importsExportsService } from "@/lib/api/services/imports-exports.service";
import type { EntityType } from "@/lib/api/services/field-registry.service";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Download, FileSpreadsheet } from "lucide-react";

const ENTITIES: { key: EntityType; label: string }[] = [
  { key: "lead", label: "Leads" },
  { key: "account", label: "Accounts" },
  { key: "contact", label: "Contacts" },
  { key: "opportunity", label: "Opportunities" },
  { key: "supplier", label: "Suppliers" },
  { key: "personal_account", label: "Person Accounts" },
  { key: "task", label: "Tasks" },
];

export default function ImportsPage() {
  const [entity, setEntity] = useState<EntityType>("lead");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      const res = await importsExportsService.exportEntity(entity, format);
      toast.success(`Export queued: ${res.filename}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function importData() {
    setBusy(true);
    try {
      await importsExportsService.importEntity(entity, {});
      toast.success("Import queued");
    } catch {
      toast.error("Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSample() {
    try {
      const r = await fetch(`/api/v1/reports/sample/${entity}`);
      const data = await r.json();
      const blob = new Blob([data.headers.join(",")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Sample download failed");
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Imports & Exports</h1>
        <p className="text-sm text-muted-foreground">
          Bulk-load or download records for any entity.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Entity</label>
            <Select value={entity} onValueChange={(v) => setEntity(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={importData} disabled={busy}>
            <Upload className="mr-2 h-4 w-4" />
            Import (queue)
          </Button>
          <Button variant="ghost" onClick={downloadSample}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Sample CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
