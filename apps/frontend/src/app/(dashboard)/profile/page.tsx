"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usersExtraService, type ProfileSummary } from "@/lib/api/services/users-extra.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    usersExtraService
      .getProfile()
      .then(setData)
      .catch(() => toast.error("Load failed"));
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await usersExtraService.updateProfile(data);
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePw() {
    if (!pw.current_password || !pw.new_password)
      return toast.error("Both fields required");
    try {
      await usersExtraService.changePassword(pw);
      toast.success("Password changed");
      setPwOpen(false);
      setPw({ current_password: "", new_password: "" });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Change failed");
    }
  }

  if (!data)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  function patch<K extends keyof ProfileSummary>(k: K, v: ProfileSummary[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Personal info, avatar, password.</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={data.name || ""} onChange={(e) => patch("name", e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={data.email} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Phone</Label>
            <Input value={data.phone || ""} onChange={(e) => patch("phone", e.target.value)} />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={data.mobile || ""} onChange={(e) => patch("mobile", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Designation</Label>
          <Input
            value={data.designation || ""}
            onChange={(e) => patch("designation", e.target.value)}
          />
        </div>
        <div>
          <Label>Avatar URL</Label>
          <Input
            value={data.avatar_url || ""}
            onChange={(e) => patch("avatar_url", e.target.value)}
          />
        </div>
        <div>
          <Label>Banner URL</Label>
          <Input
            value={data.banner_url || ""}
            onChange={(e) => patch("banner_url", e.target.value)}
          />
        </div>
        <div className="flex justify-between">
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="mr-2 h-4 w-4" />
                Change password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    value={pw.current_password}
                    onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
                  />
                </div>
                <div>
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={pw.new_password}
                    onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPwOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={changePw}>Change</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
