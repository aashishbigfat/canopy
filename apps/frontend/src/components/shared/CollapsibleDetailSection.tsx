"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleDetailSectionProps {
    icon: React.ReactNode;
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function CollapsibleDetailSection({
    icon,
    title,
    defaultOpen = false,
    children,
    className,
}: CollapsibleDetailSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer select-none border-b border-sky-100"
            >
                <ChevronRight
                    className={cn(
                        "h-4 w-4 text-sky-600 transition-transform duration-200",
                        isOpen && "rotate-90"
                    )}
                />
                <span className="text-sky-600">{icon}</span>
                <span className="text-sm font-semibold text-sky-600">{title}</span>
            </button>

            {/* Content */}
            <div
                className={cn(
                    "transition-all duration-200 ease-in-out",
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                )}
            >
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
