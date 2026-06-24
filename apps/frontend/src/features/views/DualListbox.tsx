"use client";

import * as React from "react";
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface DualItem {
  key: string;
  label: string;
}

/**
 * Transfer list: pick + order items. `available` = not chosen, `value` = chosen
 * (ordered). Reorder applies to the chosen (right) side. Used by the
 * "Select Fields to display" dialog for both Standard and Additional sections.
 */
export function DualListbox({
  available,
  value,
  onChange,
  availableLabel = "Available",
  visibleLabel = "Visible",
  height = 220,
}: {
  available: DualItem[];
  value: DualItem[];
  onChange: (next: DualItem[]) => void;
  availableLabel?: string;
  visibleLabel?: string;
  height?: number;
}) {
  const [leftSel, setLeftSel] = React.useState<string[]>([]);
  const [rightSel, setRightSel] = React.useState<string[]>([]);
  const [leftQuery, setLeftQuery] = React.useState("");
  const [rightQuery, setRightQuery] = React.useState("");

  const match = (items: DualItem[], q: string) =>
    q.trim() ? items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())) : items;

  const moveRight = () => {
    if (!leftSel.length) return;
    const moved = available.filter((i) => leftSel.includes(i.key));
    onChange([...value, ...moved]);
    setLeftSel([]);
  };
  const moveLeft = () => {
    if (!rightSel.length) return;
    onChange(value.filter((i) => !rightSel.includes(i.key)));
    setRightSel([]);
  };
  const reorder = (dir: -1 | 1) => {
    if (rightSel.length !== 1) return;
    const idx = value.findIndex((i) => i.key === rightSel[0]);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const toggle = (
    key: string,
    sel: string[],
    setSel: (v: string[]) => void,
  ) => setSel(sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key]);

  const List = ({
    items,
    sel,
    setSel,
  }: {
    items: DualItem[];
    sel: string[];
    setSel: (v: string[]) => void;
  }) => (
    <ScrollArea
      className="rounded-md border"
      style={{ height }}
    >
      <ul className="p-1">
        {items.length === 0 && (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">None</li>
        )}
        {items.map((i) => (
          <li key={i.key}>
            <button
              type="button"
              onClick={() => toggle(i.key, sel, setSel)}
              className={cn(
                "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                sel.includes(i.key) && "bg-primary/10 text-primary",
              )}
            >
              {i.label}
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{availableLabel}</div>
        <SearchBox value={leftQuery} onChange={setLeftQuery} />
        <List items={match(available, leftQuery)} sel={leftSel} setSel={setLeftSel} />
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" size="icon" variant="outline" onClick={moveRight} aria-label="Add">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={moveLeft} aria-label="Remove">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={() => reorder(-1)} aria-label="Move up">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="outline" onClick={() => reorder(1)} aria-label="Move down">
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{visibleLabel}</div>
        <SearchBox value={rightQuery} onChange={setRightQuery} />
        <List items={match(value, rightQuery)} sel={rightSel} setSel={setRightSel} />
      </div>
    </div>
  );
}

/** Stable (module-scope) search box — kept out of DualListbox's body so it is
 *  not remounted on every keystroke (which would drop input focus). */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="h-8 pl-7 text-sm"
      />
    </div>
  );
}
