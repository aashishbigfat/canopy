import { toast } from "sonner";

/**
 * Copy text to the clipboard and show a confirmation toast.
 *
 * Use this for imperative copy actions (e.g. inside dropdown-menu items) where
 * the <CopyButton> component isn't convenient. For a button affordance, prefer
 * <CopyButton> which also swaps to a check icon.
 */
export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
    if (!text) return false;
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
        toast.success(label ? `${label} copied` : "Copied to clipboard");
        return true;
    } catch {
        toast.error("Failed to copy");
        return false;
    }
}
