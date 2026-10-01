/**
 * Mirrors backend PHONE_REGEX (app/core/validators.py) for forms and inline table edits:
 * "+<code> <number>", exactly 10 digits for India (+91), 4 to 14 digits for other countries.
 */
export const PHONE_REGEX = /^\+?(?:91\s\d{10}|(?:\d|(?:[0-8]\d|9[02-9])\d{0,2})\s\d{4,14})$/;
export const PHONE_ERROR =
    "Please select a country code and enter the number: exactly 10 digits for India, 4 to 14 digits for other countries.";

/** Longest number the phone rule allows after a country code. */
export function maxPhoneDigits(countryCode: string): number {
    return countryCode === "+91" ? 10 : 14;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_CODE_REGEX = /^\+\d{1,4}$/;

/** Parse +<code> <number> — returns null when invalid. */
export function parsePhoneValue(value: string): { code: string; digits: string } | null {
    const trimmed = value.trim();
    const spaceIdx = trimmed.indexOf(" ");
    if (!trimmed.startsWith("+") || spaceIdx <= 1) {
        return null;
    }
    const code = trimmed.slice(0, spaceIdx);
    const digits = trimmed.slice(spaceIdx + 1).replace(/\D/g, "");
    if (!COUNTRY_CODE_REGEX.test(code) || !PHONE_REGEX.test(`${code} ${digits}`)) {
        return null;
    }
    return { code, digits };
}

export function normalizePhoneValue(value: string): string | null {
    const parsed = parsePhoneValue(value);
    if (!parsed) {
        return null;
    }
    return `${parsed.code} ${parsed.digits}`;
}

export function isPhoneField(field: string): boolean {
    return field === "phone" || field === "mobile";
}

export type InlineEntity = "contact" | "lead" | "account" | "person_account";

export type InlineField =
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "mobile"
    | "name";

function validateEmail(value: string, required: boolean): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? "Email is required." : null;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
        return "Invalid email address.";
    }
    return null;
}

function validatePhone(value: string, required: boolean): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? "Phone is required." : null;
    }
    if (!parsePhoneValue(trimmed)) {
        return PHONE_ERROR;
    }
    return null;
}

function validateText(
    value: string,
    {
        required,
        minLength,
        maxLength,
        label,
    }: { required: boolean; minLength?: number; maxLength?: number; label: string }
): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return required ? `${label} is required.` : null;
    }
    if (minLength !== undefined && trimmed.length < minLength) {
        return `${label} must be at least ${minLength} characters.`;
    }
    if (maxLength !== undefined && trimmed.length > maxLength) {
        return `${label} must be at most ${maxLength} characters.`;
    }
    return null;
}

/** Returns an error message when invalid, otherwise null. */
export function validateInlineField(
    entity: InlineEntity,
    field: InlineField,
    value: string
): string | null {
    if (entity === "contact") {
        switch (field) {
            case "first_name":
                return validateText(value, { required: false, maxLength: 100, label: "First name" });
            case "last_name":
                return validateText(value, { required: true, minLength: 2, maxLength: 100, label: "Last name" });
            case "email":
                return validateEmail(value, true);
            case "phone":
                return validatePhone(value, false);
            case "mobile":
                return validatePhone(value, true);
            default:
                return null;
        }
    }

    if (entity === "lead") {
        switch (field) {
            case "first_name":
                return validateText(value, { required: false, maxLength: 100, label: "First name" });
            case "last_name":
                return validateText(value, { required: true, minLength: 1, maxLength: 100, label: "Last name" });
            case "email":
                return validateEmail(value, false);
            case "phone":
            case "mobile":
                return validatePhone(value, false);
            default:
                return null;
        }
    }

    const isPerson = entity === "person_account";
    switch (field) {
        case "name":
            return validateText(value, { required: true, minLength: 2, maxLength: 255, label: "Account name" });
        case "first_name":
            return validateText(value, { required: false, maxLength: 100, label: "First name" });
        case "last_name":
            return validateText(value, {
                required: isPerson,
                minLength: isPerson ? 1 : undefined,
                maxLength: 100,
                label: "Last name",
            });
        case "email":
            return validateEmail(value, true);
        case "phone":
            return validatePhone(value, true);
        case "mobile":
            return validatePhone(value, false);
        default:
            return null;
    }
}
