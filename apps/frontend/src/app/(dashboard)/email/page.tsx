"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  messagingService,
  type EmailMessage,
} from "@/lib/api/services/messaging.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Search, Mail } from "lucide-react";

export default function EmailInboxPage() {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<EmailMessage | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await messagingService.listMessages({ page: 1, per_page: 50 });
      setMessages(r.messages);
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function search() {
    if (!q) return load();
    setLoading(true);
    try {
      setMessages(await messagingService.searchGmail(q));
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      await messagingService.syncGmail();
      toast.success("Sync queued");
      await load();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function open(m: EmailMessage) {
    setActive(m);
    if (!m.seen) {
      try {
        await messagingService.markSeen(m.id);
        setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, seen: true } : x)));
      } catch {}
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-96 shrink-0 border-r flex flex-col">
        <div className="border-b p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Inbox</h2>
            <Button size="sm" variant="ghost" onClick={sync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
            />
            <Button size="sm" variant="outline" onClick={search}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No messages.</div>
          ) : (
            <ul>
              {messages.map((m) => (
                <li
                  key={m.id}
                  onClick={() => open(m)}
                  className={`cursor-pointer border-b px-3 py-2 hover:bg-muted/40 ${
                    active?.id === m.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm ${m.seen ? "text-muted-foreground" : "font-semibold"}`}
                    >
                      {m.from_email || "(unknown)"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m.received_at?.slice(0, 10) || ""}
                    </span>
                  </div>
                  <div className="truncate text-sm">{m.subject || "(no subject)"}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.snippet || ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {!active ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Mail className="mb-2 h-10 w-10" />
            Select a message
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">{active.subject || "(no subject)"}</h2>
              <div className="text-sm text-muted-foreground">
                From {active.from_email} · {active.received_at?.slice(0, 16)}
              </div>
            </div>
            <div className="border-t pt-3">
              {active.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: active.body_html }} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{active.body_text || ""}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
