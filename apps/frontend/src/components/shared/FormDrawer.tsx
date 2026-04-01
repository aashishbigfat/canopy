"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: React.ReactNode;
    /** Optional subtitle under the title */
    subtitle?: string;
    /** Width class override, defaults to ~480px */
    widthClass?: string;
}

export function FormDrawer({
    open,
    onOpenChange,
    title,
    children,
    subtitle,
    widthClass = "w-[480px]",
}: FormDrawerProps) {
    // Close on Escape key
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onOpenChange(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onOpenChange]);

    // Prevent body scroll when drawer is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-50 bg-black/5",
                    "animate-in fade-in-0 duration-300"
                )}
                onClick={() => onOpenChange(false)}
                aria-hidden="true"
            />

            {/* Drawer panel */}
            <div
                className={cn(
                    "fixed inset-y-0 right-0 z-50 flex flex-col",
                    "bg-white shadow-2xl border-l border-slate-200",
                    "animate-in slide-in-from-right duration-300 ease-out",
                    widthClass,
                    "max-w-[90vw]" // never wider than viewport on mobile
                )}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Header - dark themed matching client design */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-800 text-white shrink-0">
                    <div>
                        <h2 className="text-base font-semibold tracking-tight">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs text-slate-300 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1.5 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </div>
        </>
    );
}
