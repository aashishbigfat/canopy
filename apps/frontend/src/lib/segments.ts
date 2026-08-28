/**
 * Segment constants for the multi-tenant, multi-industry CRM.
 *
 * Keep in sync with:  apps/backend/app/core/segment_constants.py
 */

export const SEGMENTS = {
  B2C: "B2C",             // Individual / person account
  B2B: "B2B",             // Business / organisation account
  CORPORATE: "CORPORATE", // Corporate / key accounts (was B2B_DIRECT)
} as const;

export type Segment = (typeof SEGMENTS)[keyof typeof SEGMENTS];

/** Legacy value retained only for back-compat reads (pre-migration data). */
export const LEGACY_B2B_DIRECT = "B2B_DIRECT";

/** Human-readable labels used in dropdowns, badges, and detail views. */
export const SEGMENT_LABELS: Record<string, string> = {
  [SEGMENTS.B2C]: "B2C",
  [SEGMENTS.B2B]: "B2B",
  [SEGMENTS.CORPORATE]: "Corporate",
  // Back-compat: render any un-migrated legacy value as Corporate
  [LEGACY_B2B_DIRECT]: "Corporate",
};

/** All valid segment values, ordered for dropdown rendering. */
export const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: SEGMENTS.B2C, label: SEGMENT_LABELS[SEGMENTS.B2C] },
  { value: SEGMENTS.B2B, label: SEGMENT_LABELS[SEGMENTS.B2B] },
  { value: SEGMENTS.CORPORATE, label: SEGMENT_LABELS[SEGMENTS.CORPORATE] },
];

/**
 * Return a Tailwind badge class string for the given segment.
 * Used consistently across Lead table, Opportunity details, etc.
 */
export function getSegmentBadgeClass(segment: string | undefined | null): string {
  switch (segment) {
    case SEGMENTS.B2B:
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300";
    case SEGMENTS.CORPORATE:
    case LEGACY_B2B_DIRECT:
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300";
    case SEGMENTS.B2C:
    default:
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
}

/**
 * Resolve a display label for any segment string, with fallback.
 */
export function getSegmentLabel(segment: string | undefined | null): string {
  if (!segment) return SEGMENT_LABELS[SEGMENTS.B2C];
  return SEGMENT_LABELS[segment] ?? segment;
}
