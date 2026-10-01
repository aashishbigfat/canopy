"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowUpRight,
    Building2,
    Loader2,
    MapPin,
    User as UserIcon,
} from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accountService } from "../services/accountService";
import { Account } from "../types";
import { useAccountCustomFieldValues } from "./AccountCustomFields";
import { formatDate, formatDateTime } from "@/lib/format";
import { getSegmentLabel, SEGMENTS } from "@/lib/segments";

interface AccountDetailDrawerProps {
    accountId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function Field({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={`text-sm font-medium ${link && value ? "text-blue-500 underline break-all" : "text-foreground"}`}>
                {value || "-"}
            </p>
        </div>
    );
}

function Section({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 text-sm font-bold text-foreground">
                <span className="text-blue-600">{icon}</span>
                {title}
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
        </div>
    );
}

export function AccountDetailDrawer({ accountId, open, onOpenChange }: AccountDetailDrawerProps) {
    const { data: account, isLoading, isError } = useQuery<Account>({
        queryKey: ["account", accountId],
        queryFn: () => accountService.getAccount(accountId as string),
        enabled: open && !!accountId,
    });

    const isB2C = account?.is_person_account;
    const basePath = isB2C ? "person-accounts" : "accounts";
    const badgeLabel = getSegmentLabel(account?.segment || (isB2C ? SEGMENTS.B2C : SEGMENTS.B2B));
    // Custom fields are defined for company accounts only.
    const customFieldValues = useAccountCustomFieldValues(accountId, open && !!account && !isB2C);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
            >
                <SheetHeader className="border-b bg-muted/30">
                    <div className="flex items-start justify-between gap-3 pr-8">
                        <div className="min-w-0 space-y-1">
                            <SheetTitle className="truncate text-lg">
                                {account?.name || (isLoading ? "Loading…" : "Account")}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] uppercase">
                                    {badgeLabel}
                                </Badge>
                                {account?.account_type_name && (
                                    <span className="text-xs text-muted-foreground">
                                        {account.account_type_name}
                                    </span>
                                )}
                            </SheetDescription>
                        </div>
                    </div>
                    {accountId && (
                        <Button asChild variant="outline" size="sm" className="mt-2 w-fit">
                            <Link href={`/${basePath}/${accountId}`}>
                                Open full page <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    )}
                </SheetHeader>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : isError || !account ? (
                    <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
                        Failed to load account details.
                    </div>
                ) : (
                    <div className="space-y-8 p-4">
                        <Section title="Account Information" icon={<Building2 className="h-4 w-4" />}>
                            <Field label="Account Name" value={account.name} />
                            {account.account_number != null && (
                                <Field label="Account Number" value={String(account.account_number).padStart(10, "0")} />
                            )}
                            <Field label="Website" value={account.website} link />
                            <Field label="Email" value={account.email} link />
                            <Field label="Phone" value={account.phone} />
                            {!!account.other_phones?.length && (
                                <Field label="Other Phones" value={account.other_phones.join(", ")} />
                            )}
                            {isB2C && (
                                <>
                                    <Field label="Mobile" value={account.mobile} />
                                    <Field label="Date of Birth" value={formatDate(account.date_of_birth)} />
                                </>
                            )}
                            {!isB2C && (
                                <>
                                    <Field label="Industry" value={account.industry_name} />
                                    <Field label="Account Type" value={account.account_type_name} />
                                    <Field label="Parent Account" value={account.parent_account_name} link />
                                    {customFieldValues.map((f) => (
                                        <Field key={f.id} label={f.label} value={f.value} />
                                    ))}
                                </>
                            )}
                            <Field label="Description" value={account.description} />
                        </Section>

                        <Section title="Address Information" icon={<MapPin className="h-4 w-4" />}>
                            <Field label="Billing Street" value={account.billing_street} />
                            <Field label="Billing City" value={account.billing_city} />
                            <Field label="Billing State/Province" value={account.billing_state} />
                            <Field label="Billing Zip/Postal Code" value={account.billing_zip} />
                            <Field label="Billing Country" value={account.billing_country} />
                        </Section>

                        <Section title="System Information" icon={<UserIcon className="h-4 w-4" />}>
                            <Field label="Owner" value={account.owner_name} />
                            <Field label="Created By" value={account.created_by_name} />
                            <Field label="Created At" value={formatDateTime(account.created_at)} />
                            <Field
                                label="Last Modified By"
                                value={account.last_modified_by_name || account.created_by_name}
                            />
                            <Field label="Last Modified At" value={formatDateTime(account.updated_at)} />
                        </Section>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
