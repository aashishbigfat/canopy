"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UseCopyOptions {
    /** Show a toast on success/failure. Defaults to true. */
    showToast?: boolean;
    /** How long the `copied` flag stays true, in ms. Defaults to 2000. */
    timeout?: number;
}

/**
 * Clipboard copy with a transient `copied` flag + toast feedback.
 *
 * Used everywhere we expose a "copy" affordance so the user always gets
 * confirmation that the copy actually happened (see CopyButton).
 */
export function useCopyToClipboard({ showToast = true, timeout = 2000 }: UseCopyOptions = {}) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const copy = useCallback(
        async (text: string, label?: string) => {
            if (!text) return false;
            try {
                if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    // Fallback for non-secure contexts / older browsers
                    const ta = document.createElement("textarea");
                    ta.value = text;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                }
                setCopied(true);
                if (showToast) toast.success(label ? `${label} copied` : "Copied to clipboard");
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => setCopied(false), timeout);
                return true;
            } catch {
                if (showToast) toast.error("Failed to copy");
                return false;
            }
        },
        [showToast, timeout]
    );

    return { copied, copy };
}
