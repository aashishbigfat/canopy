"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    getOpportunitiesHierarchyScope,
    setOpportunitiesHierarchyScope,
    syncOpportunitiesHierarchyScopeCookie,
} from "@/lib/opportunities-hierarchy-scope";

export default function AccessFlowOpportunitiesPage() {
    const [hierarchyOn, setHierarchyOn] = useState(false);

    useEffect(() => {
        syncOpportunitiesHierarchyScopeCookie();
        setHierarchyOn(getOpportunitiesHierarchyScope());
    }, []);

    const toggle = () => {
        const next = !hierarchyOn;
        setHierarchyOn(next);
        setOpportunitiesHierarchyScope(next);
    };

    return (
        <div className="mx-auto max-w-lg py-8 px-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        <Label htmlFor="hierarchy-toggle" className="text-base font-semibold text-foreground">
                            Hierarchy
                        </Label>
                        <p className="text-sm text-muted-foreground leading-snug">
                            When on, you only see records you own plus your downline. Peers on the same
                            hierarchy level cannot see each other&apos;s deals.
                        </p>
                    </div>
                    <button
                        id="hierarchy-toggle"
                        type="button"
                        role="switch"
                        aria-checked={hierarchyOn}
                        aria-label="Hierarchy visibility"
                        onClick={toggle}
                        className={cn(
                            "relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                            hierarchyOn ? "bg-blue-600" : "bg-input"
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                                hierarchyOn ? "translate-x-6" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
