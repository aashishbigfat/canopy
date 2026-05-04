"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  itineraryExtrasService,
  type ProformaInvoice,
} from "@/lib/api/services/itineraries-extra.service";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Send, Download } from "lucide-react";

export default function ProformaListPage() {
  const [items, setItems] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await itineraryExtrasService.listProforma());
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Proforma Invoices</h1>
        <p className="text-sm text-muted-foreground">Pre-payment invoices issued to customers.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No proforma invoices yet.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Invoice no.</th>
                <th className="px-3 py-2">Issued to</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs">{p.invoice_no || "—"}</td>
                  <td className="px-3 py-2">{p.issued_to_name || "—"}</td>
                  <td className="px-3 py-2 text-right">{p.currency} {p.total.toLocaleString()}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {p.status === "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await itineraryExtrasService.generateProforma(p.id);
                          await load();
                        }}
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        Issue
                      </Button>
                    )}
                    {p.pdf_url && (
                      <a href={p.pdf_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          <Download className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
