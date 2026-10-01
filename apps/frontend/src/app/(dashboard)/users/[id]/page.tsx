"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    Mail,
    Phone as PhoneIcon,
    Building2,
    Clock,
    Globe,
    BadgeCheck,
    User as UserIcon,
    Loader2,
    ShieldCheck,
} from "lucide-react";

import { usersExtraService, type UserProfile } from "@/lib/api/services/users-extra.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDateTime } from "@/lib/format";

function InfoRow({
    icon,
    label,
    value,
    copy,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
    copy?: boolean;
}) {
    return (
        <div className="flex items-start gap-3 py-3">
            <span className="mt-0.5 text-muted-foreground">{icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{value || "-"}</p>
                    {copy && value && <CopyButton value={value} label={label} className="h-5 w-5" iconSize={11} />}
                </div>
            </div>
        </div>
    );
}

export default function UserProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const userId = params?.id;

    const { data, isLoading, isError } = useQuery<UserProfile>({
        queryKey: ["user-profile", userId],
        queryFn: () => usersExtraService.getUserProfile(userId as string),
        enabled: !!userId,
    });

    return (
        <div className="container mx-auto max-w-5xl space-y-6 py-2">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()} title="Back">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-semibold">User Profile</h1>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
            ) : isError || !data ? (
                <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
                    Couldn&apos;t load this user&apos;s profile.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                    {/* Identity card */}
                    <div className="flex flex-col items-center rounded-xl border bg-card p-6 text-center">
                        <Avatar className="h-28 w-28 border">
                            <AvatarImage src={data.avatar_url || undefined} alt={data.name} />
                            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                                {data.name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="mt-4 flex items-center gap-1.5 text-xl font-semibold text-primary">
                            {data.name}
                            {data.is_active && <BadgeCheck className="h-4 w-4 text-green-500" />}
                        </h2>
                        {data.title && <p className="text-sm text-muted-foreground">{data.title}</p>}
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <Badge variant={data.is_active ? "secondary" : "destructive"}>
                                {data.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {data.is_available_for_assignment && (
                                <Badge variant="outline">Available for assignment</Badge>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="rounded-xl border bg-card">
                        <div className="border-b bg-muted/40 px-6 py-3">
                            <h3 className="flex items-center gap-2 text-sm font-bold">
                                <UserIcon className="h-4 w-4 text-primary" /> Contact &amp; Role
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-x-10 px-6 py-2 sm:grid-cols-2">
                            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={data.email} copy />
                            <InfoRow icon={<PhoneIcon className="h-4 w-4" />} label="Phone" value={data.phone} copy />
                            <InfoRow icon={<PhoneIcon className="h-4 w-4" />} label="Mobile" value={data.mobile} copy />
                            <InfoRow icon={<PhoneIcon className="h-4 w-4" />} label="Phone Extension" value={data.phone_extension} />
                            <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={data.role_hierarchy_name} />
                            <InfoRow icon={<Building2 className="h-4 w-4" />} label="Department" value={data.department_name} />
                            <InfoRow icon={<Clock className="h-4 w-4" />} label="Timezone" value={data.timezone} />
                            <InfoRow icon={<Globe className="h-4 w-4" />} label="Language" value={data.language} />
                            <InfoRow
                                icon={<Clock className="h-4 w-4" />}
                                label="Last Login"
                                value={data.last_login_at ? formatDateTime(data.last_login_at) : "-"}
                            />
                            <InfoRow
                                icon={<BadgeCheck className="h-4 w-4" />}
                                label="Member Since"
                                value={data.created_at ? formatDateTime(data.created_at) : "-"}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
