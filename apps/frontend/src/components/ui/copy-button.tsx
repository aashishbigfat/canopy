"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CopyButtonProps extends Omit<React.ComponentProps<typeof Button>, "onClick" | "value"> {
    /** Text to copy to the clipboard. */
    value: string;
    /** Human label used in the toast, e.g. "Phone" -> "Phone copied". */
    label?: string;
    /** Pixel size of the icon. Defaults to 12. */
    iconSize?: number;
}

/**
 * Reusable copy-to-clipboard button. Swaps to a check icon and fires a toast
 * for ~2s after a successful copy so users get clear "Copied" feedback.
 */
export function CopyButton({
    value,
    label,
    iconSize = 12,
    variant = "ghost",
    size = "icon",
    className,
    title,
    ...props
}: CopyButtonProps) {
    const { copied, copy } = useCopyToClipboard();

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={cn(className)}
            title={title ?? (copied ? "Copied" : "Copy")}
            aria-label={copied ? "Copied" : "Copy"}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copy(value, label);
            }}
            {...props}
        >
            {copied ? (
                <Check style={{ height: iconSize, width: iconSize }} className="text-green-500" />
            ) : (
                <Copy style={{ height: iconSize, width: iconSize }} />
            )}
        </Button>
    );
}
