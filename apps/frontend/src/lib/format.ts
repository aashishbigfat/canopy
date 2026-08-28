/**
 * Centralized formatting utilities for Currency & Date/Time.
 *
 * All dates stored in the backend are UTC.  The frontend always
 * displays them in IST (Asia/Kolkata, UTC+05:30).
 *
 * Currency is Indian Rupees (₹) with en-IN grouping (lakhs / crores).
 */

const TIMEZONE = "Asia/Kolkata";
const LOCALE = "en-IN";
const CURRENCY = "INR";

/**
 * Normalise a date string from the backend.
 * FastAPI/MongoDB returns ISO strings without a timezone suffix, e.g.
 * "2026-06-08T14:48:23". The browser treats those as *local time*, but
 * they are actually stored in UTC.  Appending "Z" forces UTC interpretation
 * so the subsequent toLocale* calls with timeZone:"Asia/Kolkata" work correctly.
 */
function toUTC(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  const s = date.trim();
  let parsed: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    // Date-only string – treat as UTC midnight
    parsed = new Date(s + "T00:00:00Z");
  } else if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    // Already has offset info ("Z", "+05:30", "-0800", "+00:00", ...)
    parsed = new Date(s);
  } else {
    // Bare ISO datetime – treat as UTC
    parsed = new Date(s + "Z");
  }
  // Never let "Invalid Date" leak into the UI — formatters show "-" instead
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ─── Currency ───────────────────────────────────────────────

/**
 * Format a number as ₹ Indian Rupees.
 * Example: 80000 → "₹80,000"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₹0";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with Indian grouping (no ₹ symbol).
 * Example: 80000 → "80,000"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "0";
  return value.toLocaleString(LOCALE);
}

// ─── Date & Time ────────────────────────────────────────────

/**
 * Format a date string/Date as "17 Apr 2026" in IST.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date string/Date as "17 Apr 2026, 06:30 PM" in IST.
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  return d.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as "6:30 PM" in IST.
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  return d.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as ISO date only "2026-04-17" in IST.
 */
export function formatISODate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = toUTC(date);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).formatToParts(d);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

/**
 * Format a date as "April 17, 2026" (full month name) in IST.
 * Replaces date-fns format(date, "PPP").
 */
export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as "17 Apr 2026, 14:30" in IST (24-hour).
 * Replaces date-fns format(date, "dd MMM yyyy HH:mm") and "MMM d, yyyy HH:mm".
 */
export function formatDateTime24h(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

/**
 * Format a date as "17 Apr 2026 | 02:30 PM" in IST.
 * Replaces date-fns format(date, "d MMM yyyy | hh:mm aa").
 */
export function formatDateTimeBar(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = toUTC(date);
  if (!d) return "-";
  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });
  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });
  return `${datePart} | ${timePart}`;
}
