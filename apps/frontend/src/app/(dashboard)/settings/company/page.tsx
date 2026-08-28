"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  companySettingsService,
  type CompanySettings,
} from "@/lib/api/services/admin-settings.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function CompanyPage() {
  const [data, setData] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await companySettingsService.get();
        setData(d);
      } catch {
        toast.error("Failed to load company settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data) return <div>Failed to load</div>;

  function patch<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await companySettingsService.update(data);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof CompanySettings; label: string; section: string; type?: string }[] = [
    { section: "Branding", key: "company_name", label: "Company name" },
    { section: "Branding", key: "logo_url", label: "Logo URL" },
    { section: "Branding", key: "favicon_url", label: "Favicon URL" },
    { section: "Branding", key: "primary_color", label: "Primary color" },
    { section: "Branding", key: "secondary_color", label: "Secondary color" },
    { section: "Address", key: "address_line1", label: "Address line 1" },
    { section: "Address", key: "address_line2", label: "Address line 2" },
    { section: "Address", key: "city", label: "City" },
    { section: "Address", key: "state", label: "State" },
    { section: "Address", key: "country", label: "Country" },
    { section: "Address", key: "postal_code", label: "Postal code" },
    { section: "Contact", key: "phone", label: "Phone" },
    { section: "Contact", key: "email", label: "Email" },
    { section: "Contact", key: "website", label: "Website" },
    { section: "Bank", key: "bank_name", label: "Bank name" },
    { section: "Bank", key: "bank_branch", label: "Branch" },
    { section: "Bank", key: "bank_account_number", label: "Account number" },
    { section: "Bank", key: "bank_ifsc", label: "IFSC" },
    { section: "Bank", key: "bank_swift", label: "SWIFT" },
    { section: "Bank", key: "bank_holder_name", label: "Holder name" },
    { section: "Tax / Reg", key: "gstin", label: "GSTIN" },
    { section: "Tax / Reg", key: "pan", label: "PAN" },
    { section: "Tax / Reg", key: "cin", label: "CIN" },
  ];

  const sections = Array.from(new Set(fields.map((f) => f.section)));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Company Profile</h1>
        <p className="text-sm text-muted-foreground">
          Branding, contact info, bank details, tax registrations.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section} className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">{section}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields
              .filter((f) => f.section === section)
              .map((f) => (
                <div key={f.key as string}>
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type || "text"}
                    value={(data[f.key] as string) || ""}
                    onChange={(e) => patch(f.key, e.target.value as any)}
                  />
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
