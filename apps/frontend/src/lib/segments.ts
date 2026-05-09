/**
 * Segment constants for the multi-tenant, multi-industry CRM.
 *
 * Keep in sync with:  apps/backend/app/core/segment_constants.py
 */

export const SEGMENTS = {
  B2C: "B2C",
  B2B: "B2B",               // Corporate (original B2B)
  B2B_DIRECT: "B2B_DIRECT", // New direct B2B channel
} as const;

export type Segment = (typeof SEGMENTS)[keyof typeof SEGMENTS];

/** Human-readable labels used in dropdowns, badges, and detail views. */
export const SEGMENT_LABELS: Record<string, string> = {
  [SEGMENTS.B2C]: "B2C (Individual)",
  [SEGMENTS.B2B]: "B2B (Corporate)",
  [SEGMENTS.B2B_DIRECT]: "B2B",
};

/** All valid segment values, ordered for dropdown rendering. */
export const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: SEGMENTS.B2C, label: SEGMENT_LABELS[SEGMENTS.B2C] },
  { value: SEGMENTS.B2B, label: SEGMENT_LABELS[SEGMENTS.B2B] },
  { value: SEGMENTS.B2B_DIRECT, label: SEGMENT_LABELS[SEGMENTS.B2B_DIRECT] },
];

/**
 * Return a Tailwind badge class string for the given segment.
 * Used consistently across Lead table, Opportunity details, etc.
 */
export function getSegmentBadgeClass(segment: string | undefined | null): string {
  switch (segment) {
    case SEGMENTS.B2B:
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case SEGMENTS.B2B_DIRECT:
      return "border-rose-200 bg-rose-50 text-rose-700";
    case SEGMENTS.B2C:
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

/**
 * Resolve a display label for any segment string, with fallback.
 */
export function getSegmentLabel(segment: string | undefined | null): string {
  if (!segment) return SEGMENT_LABELS[SEGMENTS.B2C];
  return SEGMENT_LABELS[segment] ?? segment;
}
