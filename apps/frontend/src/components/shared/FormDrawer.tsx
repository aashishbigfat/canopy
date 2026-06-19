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
    widthClass = "w-[560px]",
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
                    "fixed inset-0 z-50 bg-black/20",
                    "animate-in fade-in-0 duration-300"
                )}
                onClick={() => onOpenChange(false)}
                aria-hidden="true"
            />

            {/* Drawer panel */}
            <div
                className={cn(
                    "fixed inset-y-0 right-0 z-50 flex flex-col",
                    "bg-card shadow-2xl border-l border-border",
                    "animate-in slide-in-from-right duration-300 ease-out",
                    widthClass,
                    "max-w-[90vw]" // never wider than viewport on mobile
                )}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1.5 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
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
