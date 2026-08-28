"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { emailFooterService } from "@/lib/api/services/admin-settings.service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function EmailFooterPage() {
  const [tenantBody, setTenantBody] = useState("");
  const [tenantActive, setTenantActive] = useState(true);
  const [userBody, setUserBody] = useState("");
  const [userActive, setUserActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          emailFooterService.getTenant().catch(() => null),
          emailFooterService.getMine().catch(() => null),
        ]);
        if (t) {
          setTenantBody(t.body_html || "");
          setTenantActive(t.is_active);
        }
        if (u) {
          setUserBody(u.body_html || "");
          setUserActive(u.is_active);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveTenant() {
    setSavingTenant(true);
    try {
      await emailFooterService.saveTenant({ body_html: tenantBody, is_active: tenantActive });
      toast.success("Tenant footer saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingTenant(false);
    }
  }

  async function saveUser() {
    setSavingUser(true);
    try {
      await emailFooterService.saveMine({ body_html: userBody, is_active: userActive });
      toast.success("Personal footer saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Footer</h1>
        <p className="text-sm text-muted-foreground">
          Tenant-wide signature applies to everyone unless they have a personal override.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tenant default footer</h2>
          <div className="flex items-center gap-2">
            <Switch checked={tenantActive} onCheckedChange={(v: boolean) => setTenantActive(v)} />
            <Label>Active</Label>
          </div>
        </div>
        <Textarea
          rows={8}
          value={tenantBody}
          onChange={(e) => setTenantBody(e.target.value)}
          placeholder="<p>--<br/>Best regards,<br/>{{user.name}}</p>"
        />
        <div className="flex justify-end">
          <Button onClick={saveTenant} disabled={savingTenant}>
            {savingTenant && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save tenant footer
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">My personal footer (overrides tenant)</h2>
          <div className="flex items-center gap-2">
            <Switch checked={userActive} onCheckedChange={(v: boolean) => setUserActive(v)} />
            <Label>Active</Label>
          </div>
        </div>
        <Textarea
          rows={6}
          value={userBody}
          onChange={(e) => setUserBody(e.target.value)}
          placeholder="<p>--<br/>Jane Doe<br/>Sales Manager</p>"
        />
        <div className="flex justify-end">
          <Button onClick={saveUser} disabled={savingUser}>
            {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save my footer
          </Button>
        </div>
      </div>
    </div>
  );
}
