"use client";

import { useState } from "react";
import {
    Mail,
    Phone,
    Globe,
    MapPin,
    Building2,
    Calendar,
    User as UserIcon,
    Edit,
    CheckCircle2,
    Briefcase,
    ChevronLeft,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lead, LeadStatus, Source, User, Industry, Rating } from "../types";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { leadsService } from "@/lib/api/services/leads.service";
import { toast } from "sonner";
import { format } from "date-fns";

interface LeadDetailsProps {
    lead: Lead;
    statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    industries: Industry[];
    ratings: Rating[];
    experiences?: { id: string; name: string }[];
    sales_stages?: { id: string; name: string }[];
}

export function LeadDetails({
    lead,
    statuses,
    sources,
    users,
    industries,
    ratings,
    experiences = [],
    sales_stages = []
}: LeadDetailsProps) {
    const router = useRouter();
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await leadsService.deleteLead(lead.id);
            toast.success("Lead deleted successfully");
            router.push("/leads");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to delete lead");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    const status = statuses.find(s => s.id === lead.lead_status_id);
    const source = sources.find(s => s.id === lead.source_id);
    const industry = industries.find(i => i.id === lead.industry_id);
    const rating = ratings.find(r => r.id === lead.rating_id);
    const owner = users.find(u => u.id === lead.owner_id);

    return (
        <div className="space-y-6">
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{lead.full_name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href="/leads">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{lead.full_name}</h1>
                            {lead.is_converted && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex gap-1 items-center">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Converted
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">
                            {lead.title ? `${lead.title} at ` : ""}{lead.company || "No Company"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/leads/${lead.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                    {!lead.is_converted ? (
                        <Button
                            className="bg-green-600 hover:bg-green-700 font-medium"
                            size="sm"
                            onClick={() => setIsConvertOpen(true)}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Convert Lead
                        </Button>
                    ) : lead.opportunity_id && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/opportunities/${lead.opportunity_id}`}>
                                <Briefcase className="mr-2 h-4 w-4" />
                                View Opportunity
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Client Information */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-blue-500" />
                                Client Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Salutation</p>
                                <p className="text-sm">{lead.salutation || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    <span className="text-sm">{lead.email || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span className="text-sm">{lead.phone || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Mobile</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <span className="text-sm">{lead.mobile || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Segment</p>
                                <Badge variant="secondary" className={lead.segment === 'B2B' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                                    {lead.segment || "B2C"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Company & Source */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                                Company & Source
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Company Name</p>
                                <p className="text-sm">{lead.company || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">No of Employees</p>
                                <p className="text-sm">{lead.no_employees || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Website</p>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-3 w-3 text-slate-400" />
                                    <a href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                        {lead.website || "N/A"}
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Source</p>
                                <p className="text-sm">{source?.name || "Direct"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Source Medium</p>
                                <p className="text-sm">{lead.source_medium || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Campaign Name</p>
                                <p className="text-sm">{lead.campaign_name || "-"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-red-500" />
                                Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Country</p>
                                <p className="text-sm">{lead.country || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">State</p>
                                <p className="text-sm">{lead.state || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">City</p>
                                <p className="text-sm">{lead.city || "-"}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Street Address</p>
                                <p className="text-sm">{lead.street || "-"}</p>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Travel Requirements */}
                    <Card className="border-blue-100 bg-blue-50/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Travel Requirements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Travel Date</p>
                                    <p className="text-sm font-semibold">{lead.travel_date || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Nights</p>
                                    <p className="text-sm">{lead.no_of_nights || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Pax</p>
                                    <p className="text-sm font-semibold text-blue-700">{lead.no_of_pax || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Fixed Package?</p>
                                    <p className="text-sm">{lead.is_fixed ? "Yes" : "No"}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Experience</p>
                                <p className="text-sm font-medium">
                                    {experiences.find(e => e.id === lead.experience_id)?.name || "-"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Destinations</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {lead.destinations && lead.destinations.length > 0 ? (
                                        lead.destinations.map((dest, i) => (
                                            <Badge key={i} variant="outline" className="bg-white text-xs">
                                                {dest}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm">-</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {/* Classification */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Classification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                    {status?.name || "New"}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Industry</p>
                                <span className="text-sm">{industry?.name || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Rating</p>
                                <span className="text-sm">{rating?.name || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Lead Owner</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] uppercase font-bold text-slate-600">
                                        {owner?.name?.substring(0, 2) || "OW"}
                                    </div>
                                    <span className="text-sm">{owner?.name || "Unassigned"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Information */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">System Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs uppercase">Created At</span>
                                <span className="text-xs font-medium">{format(new Date(lead.created_at), "MMM d, yyyy HH:mm")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs uppercase">Last Modified</span>
                                <span className="text-xs font-medium">{format(new Date(lead.updated_at), "MMM d, yyyy HH:mm")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs uppercase">View Count</span>
                                <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1.5">{lead.view_count}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConvertLeadDialog
                lead={lead}
                open={isConvertOpen}
                onOpenChange={setIsConvertOpen}
                users={users}
                experiences={experiences}
                sales_stages={sales_stages}
                onSuccess={() => {
                    router.push("/leads");
                }}
            />
        </div>
    );
}

