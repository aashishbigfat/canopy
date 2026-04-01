"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEARCH_MODULES, SearchModuleValue } from "@/lib/api/services/search.service";

export function GlobalSearchBar() {
    const router = useRouter();
    const [module, setModule] = useState<SearchModuleValue>("accounts");
    const [query, setQuery] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLabel = SEARCH_MODULES.find((m) => m.value === module)?.label ?? "Files";

    const handleSearch = () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        router.push(`/search?module=${module}&q=${encodeURIComponent(trimmed)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex w-fit items-center h-9 rounded-full overflow-visible border border-white/10 bg-white/5 backdrop-blur-sm transition-all focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-cyan-500/30">
            {/* Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 h-9 pl-4 pr-3 text-sm font-medium text-white whitespace-nowrap bg-[#1a6bb0] hover:bg-[#1a5fa0] transition-colors border-r border-white/10 rounded-l-full"
                >
                    {currentLabel}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-xl z-[200] overflow-hidden py-1">
                        {SEARCH_MODULES.map((m) => (
                            <button
                                key={m.value}
                                type="button"
                                onClick={() => {
                                    setModule(m.value);
                                    setDropdownOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors",
                                    m.value === module && "bg-blue-50 text-[#1a6bb0] font-medium"
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Input */}
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Universal search..."
                className="h-9 w-[180px] lg:w-[260px] bg-transparent px-3 text-sm text-white placeholder:text-slate-400 outline-none"
            />

            {/* Search Icon Button */}
            <button
                type="button"
                onClick={handleSearch}
                className="flex items-center justify-center h-9 w-10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 rounded-r-full"
                aria-label="Search"
            >
                <Search className="h-4 w-4" />
            </button>
        </div>
    );
}
