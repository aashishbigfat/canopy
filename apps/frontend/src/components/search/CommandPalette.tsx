"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    Search,
    User,
    Briefcase,
    Building2,
    Users,
    Loader2,
    ArrowRight,
    Command,
    UserCircle,
    Truck,
    FileText,
} from "lucide-react";

import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchService, SearchResultGroup, SearchResultItem } from "@/lib/api/services/search.service";
import { useIndustryLabels } from "@/lib/industry-labels";

const moduleIcons: Record<string, React.ReactNode> = {
    leads: <User className="h-4 w-4" />,
    accounts: <Building2 className="h-4 w-4" />,
    contacts: <Users className="h-4 w-4" />,
    opportunities: <Briefcase className="h-4 w-4" />,
    person_accounts: <UserCircle className="h-4 w-4" />,
    suppliers: <Truck className="h-4 w-4" />,
    files: <FileText className="h-4 w-4" />,
};

const moduleColors: Record<string, string> = {
    leads: "text-blue-500",
    accounts: "text-indigo-500",
    contacts: "text-emerald-500",
    opportunities: "text-amber-500",
    person_accounts: "text-purple-500",
    suppliers: "text-orange-500",
    files: "text-slate-500",
};

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const labels = useIndustryLabels();

    // Map backend module keys → industry-aware display labels
    const groupLabelOverrides: Record<string, string> = {
        suppliers: labels.suppliers,
        leads: labels.leads,
        opportunities: labels.opportunities,
        accounts: labels.accounts,
    };

    // Search query
    const { data, isLoading } = useQuery({
        queryKey: ["global-search", query],
        queryFn: () => searchService.search(query, 5),
        enabled: query.length >= 2,
        staleTime: 1000,
    });

    // Flatten results for keyboard navigation
    const flatResults: (SearchResultItem & { module: string })[] =
        data?.results.flatMap(group =>
            group.items.map(item => ({ ...item, module: group.module }))
        ) || [];

    // Keyboard shortcut to open (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setQuery("");
            setSelectedIndex(0);
        }
    }, [open]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [data]);

    const handleKeyDownInInput = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && flatResults[selectedIndex]) {
            e.preventDefault();
            router.push(flatResults[selectedIndex].url);
            setOpen(false);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }, [flatResults, selectedIndex, router]);

    const handleItemClick = (url: string) => {
        router.push(url);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 overflow-hidden max-w-2xl">
                {/* Search Input */}
                <div className="flex items-center border-b px-4 py-3">
                    <Search className="h-5 w-5 text-muted-foreground mr-3" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDownInInput}
                        placeholder={`Search ${labels.leads.toLowerCase()}, ${labels.accounts.toLowerCase()}, contacts...`}
                        className="border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground"
                    />
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {query.length < 2 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Command className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Type at least 2 characters to search</p>
                            <p className="text-xs mt-1">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">K</kbd> to open anytime</p>
                        </div>
                    ) : data?.results.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No results found for &quot;{query}&quot;</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {data?.results.map((group, groupIndex) => (
                                <div key={group.module}>
                                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {groupLabelOverrides[group.module] || group.label}
                                    </div>
                                    {group.items.map((item, itemIndex) => {
                                        // Calculate flat index
                                        const flatIndex = data.results
                                            .slice(0, groupIndex)
                                            .reduce((sum, g) => sum + g.items.length, 0) + itemIndex;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleItemClick(item.url)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 cursor-pointer",
                                                    flatIndex === selectedIndex
                                                        ? "bg-primary/10"
                                                        : "hover:bg-muted/50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-lg bg-muted",
                                                    moduleColors[group.module]
                                                )}>
                                                    {moduleIcons[group.module] || <Search className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{item.title}</p>
                                                    {item.subtitle && (
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {item.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↓</kbd> Navigate</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↵</kbd> Select</span>
                        <span><kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Esc</kbd> Close</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
