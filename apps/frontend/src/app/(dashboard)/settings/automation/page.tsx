"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, FlaskConical } from "lucide-react";
import {
  automationService,
  type AutomationRule,
  type AutomationRulePayload,
  type AutomationCondition,
} from "@/lib/api/services/automation-rules.service";

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [meta, setMeta] = useState<{ triggers: string[]; actions: string[]; operators: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([automationService.list(), automationService.triggers()]);
      setRules(list);
      setMeta(m);
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await automationService.remove(deleteId);
      toast.success("Rule deleted");
      reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Automation Rules</h1>
        <p className="text-sm text-muted-foreground">
          Run actions when entities are created or change. Rules respect tenant boundaries
          and (optionally) industry. Conditions support dot-paths into nested fields.
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          No rules yet. Try: when a lead has <code>industry_data.requires_field_meeting=true</code>, create a Site Survey visit.
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2 text-right">Fires</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.trigger_event}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.action_type}</td>
                  <td className="px-3 py-2 text-right">{r.fire_count}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={r.is_active ? "text-emerald-500 border-emerald-500/40" : "text-muted-foreground"}>
                      {r.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RuleDialog
        open={open}
        onOpenChange={setOpen}
        rule={editing}
        meta={meta}
        onSaved={reload}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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

function RuleDialog({
  open, onOpenChange, rule, meta, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: AutomationRule | null;
  meta: { triggers: string[]; actions: string[]; operators: string[] } | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AutomationRulePayload>({
    name: "", trigger_event: "lead.created", action_type: "create_bd_visit",
    is_active: true, conditions_logic: "AND", priority: 100,
    conditions: [], action_params: {},
  });
  const [paramsJson, setParamsJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [testJson, setTestJson] = useState('{"industry_data":{"requires_field_meeting":true}}');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name,
        description: rule.description || "",
        is_active: rule.is_active,
        trigger_event: rule.trigger_event,
        conditions: rule.conditions,
        conditions_logic: rule.conditions_logic,
        action_type: rule.action_type,
        action_params: rule.action_params,
        industry: rule.industry || undefined,
        priority: rule.priority,
      });
      setParamsJson(JSON.stringify(rule.action_params, null, 2));
    } else {
      setForm({
        name: "", trigger_event: meta?.triggers[0] || "lead.created",
        action_type: meta?.actions[0] || "create_bd_visit",
        is_active: true, conditions_logic: "AND", priority: 100, conditions: [], action_params: {},
      });
      setParamsJson("{}");
    }
    setTestResult(null);
  }, [rule, meta, open]);

  const addCondition = () => {
    setForm({
      ...form,
      conditions: [...(form.conditions || []), { path: "", op: "eq", value: "" }],
    });
  };
  const removeCondition = (idx: number) => {
    setForm({ ...form, conditions: form.conditions!.filter((_, i) => i !== idx) });
  };
  const setCondition = (idx: number, patch: Partial<AutomationCondition>) => {
    setForm({
      ...form,
      conditions: form.conditions!.map((c, i) => i === idx ? { ...c, ...patch } : c),
    });
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    let parsedParams: Record<string, any> = {};
    try { parsedParams = JSON.parse(paramsJson || "{}"); }
    catch { return toast.error("Action params is not valid JSON"); }
    const payload: AutomationRulePayload = { ...form, action_params: parsedParams };
    setSaving(true);
    try {
      if (rule) await automationService.update(rule.id, payload);
      else await automationService.create(payload);
      toast.success(rule ? "Rule updated" : "Rule created");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!rule) return toast.warning("Save the rule first, then test against a sample.");
    let sample: Record<string, any>;
    try { sample = JSON.parse(testJson); }
    catch { return toast.error("Sample is not valid JSON"); }
    try {
      const result = await automationService.test(rule.id, sample);
      setTestResult(result);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Test failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Rule" : "New Rule"}</DialogTitle>
          <DialogDescription>
            Trigger → conditions → action. Rule applies tenant-wide; set Industry to restrict.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Priority (lower runs first)</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 100 })} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Trigger *</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(meta?.triggers || []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Action *</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(meta?.actions || []).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Industry scope (optional)</Label>
              <Select value={form.industry || "__any__"} onValueChange={(v) => setForm({ ...form, industry: v === "__any__" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any</SelectItem>
                  <SelectItem value="travel">travel</SelectItem>
                  <SelectItem value="healthcare">healthcare</SelectItem>
                  <SelectItem value="education">education</SelectItem>
                  <SelectItem value="manufacturing">manufacturing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch
                id="active"
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              <div className="flex items-center gap-2">
                <Select value={form.conditions_logic} onValueChange={(v) => setForm({ ...form, conditions_logic: v as any })}>
                  <SelectTrigger className="w-20 h-7"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addCondition}>Add</Button>
              </div>
            </div>
            {(form.conditions || []).length === 0 && (
              <p className="text-xs text-muted-foreground">No conditions = always match.</p>
            )}
            {(form.conditions || []).map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5"
                  placeholder="path (e.g. industry_data.requires_field_meeting)"
                  value={c.path}
                  onChange={(e) => setCondition(idx, { path: e.target.value })}
                />
                <Select value={c.op} onValueChange={(v) => setCondition(idx, { op: v as any })}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta?.operators || []).map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-4"
                  placeholder='value (JSON, e.g. true or "Hot")'
                  value={typeof c.value === "string" ? c.value : JSON.stringify(c.value)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    let parsed: any = raw;
                    try { parsed = JSON.parse(raw); } catch { /* keep string */ }
                    setCondition(idx, { value: parsed });
                  }}
                />
                <Button size="icon" variant="ghost" onClick={() => removeCondition(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-1.5">
            <Label>Action params (JSON)</Label>
            <Textarea
              rows={5}
              className="font-mono text-xs"
              value={paramsJson}
              onChange={(e) => setParamsJson(e.target.value)}
              placeholder={'{\n  "activity_type_name": "Site Survey",\n  "days_offset": 2\n}'}
            />
            <p className="text-xs text-muted-foreground">
              For <code>create_bd_visit</code>: activity_type_name, days_offset, duration_min, title, description.
              For <code>send_notification</code>: to (owner_id|reporting_manager|bd_owner|&lt;user_id&gt;), title, message, type.
              For <code>set_field</code>: field, value. For <code>assign_owner</code>: user_id.
            </p>
          </div>

          {rule && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                <Label>Test (against sample JSON)</Label>
              </div>
              <Textarea
                rows={3}
                className="font-mono text-xs"
                value={testJson}
                onChange={(e) => setTestJson(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={runTest}>Run Test</Button>
                {testResult && (
                  <Badge variant="outline" className={testResult.matched ? "text-emerald-500 border-emerald-500/40" : "text-red-500 border-red-500/40"}>
                    {testResult.matched ? "MATCH" : "no match"}
                    {testResult.would_run_action && ` → ${testResult.would_run_action}`}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {rule ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
