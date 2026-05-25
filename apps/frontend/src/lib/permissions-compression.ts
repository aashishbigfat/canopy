/**
 * Compression and decompression utilities for user permissions.
 * Maps full permission strings to compact 2-character codes to prevent NextAuth cookie chunking.
 */

// Prefixes aligned with apps/backend/app/services/role_service.py
const PREFIXES = [
    "view_",
    "create_",
    "edit_",
    "delete_",
    "manage_",
    "approve_",
    "check_in_",
    "reimburse_",
    "upload_",
    "download_",
    "send_",
    "feature_"
];

// Suffixes (resources) aligned with apps/backend/app/services/role_service.py
const SUFFIXES = [
    "account",
    "person_account",
    "contact",
    "lead",
    "opportunity",
    "task",
    "event",
    "note",
    "email",
    "email_template",
    "file",
    "supplier",
    "hierarchy",
    "product",
    "quote",
    "invoice",
    "user",
    "role",
    "reports",
    "report",
    "dashboard",
    "sales_stages",
    "sales_targets",
    "incentives",
    "leaderboard",
    "settings",
    "system",
    "tenants",
    "billing",
    "notifications",
    "webhooks",
    "webhook",
    "department",
    "bd_panel",
    "bd_visit",
    "expense",
    "live_tracking",
    "territory",
    "automation_rules",
    "destination",
    "itinerary",
    "package",
    "package_pricing",
    "patient",
    "provider",
    "appointment",
    "care_plan",
    "insurance_verification",
    "referral",
    "program",
    "admission",
    "enrollment",
    "product_catalog",
    "bom",
    "production_order",
    "inventory",
    "quality_inspection",
    "warehouse",
    "work_order"
];

// 62-character lookup table (exactly 1 character representation for indices 0-61)
const CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toChar(index: number): string {
    return CHARS[index] || "?";
}

function toIndex(char: string): number {
    return CHARS.indexOf(char);
}

/**
 * Compresses an array of permission strings into a compact, comma-separated string.
 * e.g., ["view_account", "create_account"] -> "00,10"
 */
export function compressPermissions(permissions: string[] | undefined): string {
    if (!permissions || !Array.isArray(permissions)) return "";

    const uniquePerms = Array.from(new Set(permissions));
    const compressed = uniquePerms.map((perm) => {
        // Find matching prefix
        const prefixIdx = PREFIXES.findIndex((p) => perm.startsWith(p));
        if (prefixIdx !== -1) {
            const suffix = perm.substring(PREFIXES[prefixIdx].length);
            const suffixIdx = SUFFIXES.indexOf(suffix);
            if (suffixIdx !== -1) {
                return toChar(prefixIdx) + toChar(suffixIdx);
            }
        }

        // Fallback: prefix with "*" if it doesn't fit standard prefix/suffix format
        return "*" + perm;
    });

    return compressed.join(",");
}

/**
 * Decompresses a compressed permissions string back into an array of permission strings.
 * Handles backward compatibility if the input is already a string array.
 * e.g., "00,10" -> ["view_account", "create_account"]
 */
export function decompressPermissions(compressed: string | string[] | undefined): string[] {
    if (!compressed) return [];

    if (Array.isArray(compressed)) {
        return compressed;
    }

    if (typeof compressed !== "string") {
        return [];
    }

    return compressed.split(",").map((part) => {
        if (part.startsWith("*")) {
            return part.substring(1);
        }

        // Robustness: if it's already a full permission string (e.g. contains underscore and is longer than 2 chars), return it
        if (part.includes("_") && part.length > 2) {
            return part;
        }

        if (part.length !== 2) {
            return part;
        }

        const prefixChar = part[0];
        const suffixChar = part[1];

        const prefixIdx = toIndex(prefixChar);
        const suffixIdx = toIndex(suffixChar);

        if (prefixIdx !== -1 && suffixIdx !== -1) {
            const prefix = PREFIXES[prefixIdx];
            const suffix = SUFFIXES[suffixIdx];
            if (prefix && suffix) {
                return prefix + suffix;
            }
        }

        return part; // Fallback
    });
}

