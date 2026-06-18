"use client";

import {
    Phone,
    Mail,
    User,
    Edit,
    Trash2,
    Building2,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { ChangeOwnerDialog } from "./ChangeOwnerDialog";
import { OwnerPopover } from "./OwnerPopover";
import { useEffect, useState } from "react";
import { getSegmentBadgeClass, getSegmentLabel } from "@/lib/segments";

interface EntityDetailHeaderProps {
    type: "Contact" | "Account" | "Person Account" | "Lead" | "Supplier";
    customLabel?: string;
    badge?: string;
    name: string;
    id: string;
    phone?: string;
    email?: string;
    ownerName?: string;
    ownerId?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onChangeOwner?: (newOwnerId: string) => void | Promise<unknown>;
    isChangingOwner?: boolean;
}

export function EntityDetailHeader({
    type,
    customLabel,
    badge,
    name,
    id,
    phone,
    email,
    ownerName,
    ownerId,
    onEdit,
    onDelete,
    onChangeOwner,
    isChangingOwner
}: EntityDetailHeaderProps) {
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

    // Optimistic owner: reflect a just-changed owner instantly, without waiting
    // for the server round-trip / router.refresh() to land. Once the parent
    // re-renders with the reconciled owner prop, this override is cleared.
    const [optimisticOwner, setOptimisticOwner] = useState<{ id?: string; name: string } | null>(null);
    useEffect(() => {
        setOptimisticOwner(null);
    }, [ownerId, ownerName]);

    const displayOwnerId = optimisticOwner?.id ?? ownerId;
    const displayOwnerName = optimisticOwner?.name ?? ownerName;

    return (
        <div className="crm-surface mb-6 overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="mt-1 flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground">
                            {type === "Contact" ? <User size={24} /> : type === "Lead" ? <User size={24} /> : <Building2 size={24} />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">{customLabel || type}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <h1 className="text-xl md:text-2xl font-semibold break-words min-w-0">{name}</h1>
                                {badge && (
                                    <Badge variant="outline" className={`ml-2 ${getSegmentBadgeClass(badge)}`}>
                                        {getSegmentLabel(badge)}
                                    </Badge>
                                )}
                                <CopyButton value={name} label="Name" className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                        <Button
                            variant="default"
                            onClick={onEdit}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Phone</p>
                        <div className="flex items-center gap-2">
                            {phone ? (
                                <a href={`tel:${phone}`} className="text-sm text-primary font-medium hover:underline">
                                    {phone}
                                </a>
                            ) : (
                                <span className="text-sm text-slate-400 font-medium">No Phone</span>
                            )}
                            {phone && (
                                <CopyButton value={phone} label="Phone" className="h-4 w-4" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Email</p>
                        <div className="flex items-center gap-2 overflow-hidden">
                            {email ? (
                                <a href={`mailto:${email}`} className="text-sm text-primary font-medium truncate max-w-full hover:underline">
                                    {email}
                                </a>
                            ) : (
                                <span className="text-sm text-slate-400 font-medium">No Email</span>
                            )}
                            {email && (
                                <CopyButton value={email} label="Email" className="h-4 w-4 flex-shrink-0" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase">{type} Owner</p>
                        <div className="flex items-center gap-2">
                            <OwnerPopover ownerId={displayOwnerId} ownerName={displayOwnerName} className="text-sm font-medium" />
                            {onChangeOwner ? (
                                <button
                                    type="button"
                                    onClick={() => setIsOwnerModalOpen(true)}
                                    title="Change owner"
                                    className="text-primary transition-opacity hover:opacity-70"
                                >
                                    <User className="h-3.5 w-3.5" />
                                </button>
                            ) : (
                                <User className="h-3 w-3 text-primary" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase">{type} ID</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300 font-medium">{id?.slice(-8) || "N/A"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {onChangeOwner && (
                <ChangeOwnerDialog
                    isOpen={isOwnerModalOpen}
                    onClose={() => setIsOwnerModalOpen(false)}
                    onConfirm={async (newOwnerId, newOwnerName) => {
                        // Show the new owner instantly; revert if the server rejects.
                        if (newOwnerName) setOptimisticOwner({ id: newOwnerId, name: newOwnerName });
                        setIsOwnerModalOpen(false);
                        try {
                            await onChangeOwner(newOwnerId);
                        } catch {
                            setOptimisticOwner(null);
                        }
                    }}
                    type={type}
                    isLoading={isChangingOwner}
                    currentOwnerId={displayOwnerId}
                />
            )}
        </div>
    );
}
