"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { subscriptionService } from "@/lib/api/services/subscription.service";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function BillingPage() {
  const [status, setStatus] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, p, b] = await Promise.all([
        subscriptionService.tenantStatus(),
        subscriptionService.listProducts(),
        subscriptionService.billingSummary().catch(() => null),
      ]);
      setStatus(s);
      setProducts(p);
      setSummary(b);
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground">Subscription status and invoices.</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Subscription status</h2>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {status?.has_active_subscription ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Inactive</span>
                </>
              )}
              {status?.status && (
                <span className="text-muted-foreground">· {status.status}</span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await subscriptionService.triggerUpdate();
              await load();
              toast.success("Refreshed");
            }}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Available plans</h2>
        {products.length === 0 ? (
          <div className="text-sm text-muted-foreground">No products configured.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="rounded border p-3">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 text-2xl">
                  {p.amount?.toLocaleString() || 0}
                  <span className="ml-1 text-sm text-muted-foreground">/ {p.interval || "month"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Recent invoices</h2>
        {!summary?.invoices?.length ? (
          <div className="text-sm text-muted-foreground">No invoices.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1 text-right">Amount</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.invoices.map((i: any) => (
                <tr key={i.id} className="border-b last:border-b-0">
                  <td className="px-2 py-1 text-muted-foreground">
                    {i.issued_at?.slice(0, 10) || "—"}
                  </td>
                  <td className="px-2 py-1 text-right">{i.amount?.toLocaleString() || "—"}</td>
                  <td className="px-2 py-1">{i.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
