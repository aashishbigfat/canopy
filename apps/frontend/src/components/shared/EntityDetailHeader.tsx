"use client";

import {
    Phone,
    Mail,
    User,
    Edit,
    Trash2,
    Copy,
    ChevronDown,
    Building2,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangeOwnerDialog } from "./ChangeOwnerDialog";
import { useState } from "react";
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
    onEdit?: () => void;
    onDelete?: () => void;
    onChangeOwner?: (newOwnerId: string) => void;
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
    onEdit,
    onDelete,
    onChangeOwner,
    isChangingOwner
}: EntityDetailHeaderProps) {
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="crm-surface mb-6 overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground">
                            {type === "Contact" ? <User size={24} /> : type === "Lead" ? <User size={24} /> : <Building2 size={24} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">{customLabel || type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-semibold">{name}</h1>
                                {badge && (
                                    <Badge variant="outline" className={`ml-2 ${getSegmentBadgeClass(badge)}`}>
                                        {getSegmentLabel(badge)}
                                    </Badge>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(name)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Clone</DropdownMenuItem>
                                {onChangeOwner && (
                                    <DropdownMenuItem onClick={() => setIsOwnerModalOpen(true)}>
                                        Change Owner
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(phone)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
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
                                <Button variant="ghost" size="icon" className="h-4 w-4 flex-shrink-0" onClick={() => handleCopy(email)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase">{type} Owner</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-primary font-medium">{ownerName || "Unassigned"}</span>
                            <User className="h-3 w-3 text-primary" />
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
                    onConfirm={(newOwnerId) => {
                        onChangeOwner(newOwnerId);
                        setIsOwnerModalOpen(false);
                    }}
                    type={type}
                    isLoading={isChangingOwner}
                />
            )}
        </div>
    );
}
