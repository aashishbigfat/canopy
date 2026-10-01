"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { customFieldsService, AdditionalField } from "@/lib/api/services/field-registry.service";
import { realCustomFields } from "@/features/views/accountFields";
import { cn } from "@/lib/utils";

/**
 * Active custom fields defined for company accounts. The registry endpoint also
 * returns records that duplicate standard fields, so those are dropped.
 */
export function useAccountCustomFieldDefs(enabled = true): AdditionalField[] {
    const { data = [] } = useQuery({
        queryKey: ["custom-fields", "account"],
        queryFn: () => customFieldsService.list("account", true),
        staleTime: 5 * 60 * 1000,
        enabled,
    });
    return React.useMemo(() => realCustomFields("account", data), [data]);
}

/** Saved custom-field values of one company account, in field order. */
export function useAccountCustomFieldValues(accountId?: string | null, enabled = true) {
    const defs = useAccountCustomFieldDefs(enabled);
    const { data: values } = useQuery({
        queryKey: ["custom-field-values", "account", accountId],
        queryFn: () => customFieldsService.readValues("account", accountId as string),
        enabled: enabled && !!accountId,
    });
    return React.useMemo(
        () => defs.map((d) => ({ id: d.id, label: d.label || d.name, value: values?.[d.id]?.value ?? "" })),
        [defs, values],
    );
}

const INPUT_TYPE_BY_FIELD_TYPE: Record<string, string> = {
    number: "number",
    currency: "number",
    date: "date",
    email: "email",
    url: "url",
};

interface AccountCustomFieldInputsProps {
    fields: AdditionalField[];
    /** additional_field_id -> value */
    values: Record<string, string>;
    errors?: Record<string, string>;
    onChange: (fieldId: string, value: string) => void;
}

/** Inputs for the account form. Renders nothing when no custom field is defined. */
export function AccountCustomFieldInputs({ fields, values, errors, onChange }: AccountCustomFieldInputsProps) {
    return (
        <>
            {fields.map((f) => {
                const inputId = `account-custom-field-${f.id}`;
                const value = values[f.id] ?? "";
                const options =
                    f.field_type === "boolean" ? ["Yes", "No"] : f.options?.length ? f.options : null;
                const isTextarea = f.field_type === "textarea";
                return (
                    <div key={f.id} className={cn("space-y-2", isTextarea && "md:col-span-2")}>
                        <Label htmlFor={inputId} className={cn(errors?.[f.id] && "text-destructive")}>
                            {f.label || f.name}
                            {f.is_mandatory ? " *" : ""}
                        </Label>
                        {isTextarea ? (
                            <Textarea
                                id={inputId}
                                className="min-h-24"
                                value={value}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        ) : options ? (
                            <Select value={value} onValueChange={(v) => onChange(f.id, v)}>
                                <SelectTrigger id={inputId}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id={inputId}
                                type={INPUT_TYPE_BY_FIELD_TYPE[f.field_type] || "text"}
                                value={value}
                                onChange={(e) => onChange(f.id, e.target.value)}
                            />
                        )}
                        {errors?.[f.id] && <p className="text-destructive text-sm">{errors[f.id]}</p>}
                    </div>
                );
            })}
        </>
    );
}
