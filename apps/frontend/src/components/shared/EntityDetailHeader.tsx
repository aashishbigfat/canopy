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
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntityDetailHeaderProps {
    type: "Contact" | "Account" | "Person Account";
    customLabel?: string;
    badge?: string;
    name: string;
    id: string;
    phone?: string;
    email?: string;
    ownerName?: string;
    onEdit?: () => void;
    onDelete?: () => void;
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
    onDelete
}: EntityDetailHeaderProps) {
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 h-12 w-12 rounded bg-blue-600 flex items-center justify-center text-white">
                            {type === "Contact" ? <User size={24} /> : <Building2 size={24} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{customLabel || type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
                                {badge && (
                                    <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                                        {badge}
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
                            className="bg-blue-600 hover:bg-blue-700"
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
                                <DropdownMenuItem>Change Owner</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Phone</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-blue-600 font-medium">{phone || "No Phone"}</span>
                            {phone && (
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(phone)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-sm text-blue-600 font-medium truncate max-w-full">{email || "No Email"}</span>
                            {email && (
                                <Button variant="ghost" size="icon" className="h-4 w-4 flex-shrink-0" onClick={() => handleCopy(email)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">{type} Owner</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-blue-600 font-medium">{ownerName || "Unassigned"}</span>
                            <User className="h-3 w-3 text-blue-600" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">{type} ID</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 font-medium">{id?.slice(-8) || "N/A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
