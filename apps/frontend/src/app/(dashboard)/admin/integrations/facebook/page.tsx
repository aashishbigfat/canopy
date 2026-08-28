"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { miscService } from "@/lib/api/services/misc.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, Save, RefreshCw } from "lucide-react";

export default function FacebookIntegrationPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadHealth() {
    setLoading(true);
    try {
      setHealth(await miscService.fbHealth());
    } catch {
      toast.error("Health check failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  async function save() {
    if (!token) return toast.error("Token required");
    setSaving(true);
    try {
      await miscService.storeFbToken({ long_lived_token: token, page_id: pageId || undefined });
      toast.success("Saved");
      setToken("");
      await loadHealth();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function pull() {
    try {
      await miscService.pullFbLeads();
      toast.success("Pull queued");
    } catch {
      toast.error("Pull failed");
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Facebook integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect Facebook Lead Ads to auto-capture leads.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Status</h2>
          <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {health?.fb_configured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Configured</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Not configured</span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Configure access</h2>
        <div>
          <Label>Long-lived access token</Label>
          <Input value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div>
          <Label>Page ID (optional)</Label>
          <Input value={pageId} onChange={(e) => setPageId(e.target.value)} />
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={pull} disabled={!health?.fb_configured}>
            Pull leads now
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-1 h-4 w-4" />
            Save token
          </Button>
        </div>
      </div>
    </div>
  );
}
