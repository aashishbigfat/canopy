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
    Trash2,
    Paperclip,
    LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CollapsibleDetailSection } from "@/components/shared/CollapsibleDetailSection";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { Lead, LeadStatus, Source, User, Industry } from "../types";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { LeadFormDrawer } from "./LeadFormDrawer";
import { leadsService } from "@/lib/api/services/leads.service";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

interface LeadDetailsProps {
    lead: Lead;
    statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    industries: Industry[];
    experiences?: { id: string; name: string }[];
    sales_stages?: { id: string; name: string }[];
}

export function LeadDetails({
    lead,
    statuses,
    sources,
    users,
    industries,
    experiences = [],
    sales_stages = []
}: LeadDetailsProps) {
    const router = useRouter();
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

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
    const owner = users.find(u => u.id === lead.owner_id);

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
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

            {/* High Fidelity Header */}
            <EntityDetailHeader
                type="Lead"
                badge={lead.segment || "B2C"}
                name={lead.full_name}
                id={lead.id}
                phone={lead.phone || lead.mobile}
                email={lead.email}
                ownerName={owner?.name}
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-11 p-0 gap-8">
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="activity"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Activity
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-6">
                            <TabsContent value="details" className="mt-0 space-y-6">
                                {/* Lead Information */}
                                <CollapsibleDetailSection
                                    title="Lead Information"
                                    icon={<UserIcon className="h-4 w-4" />}
                                    defaultOpen={true}
                                    className="border-slate-200"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salutation</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.salutation || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.full_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-medium text-blue-600 underline">{lead.email || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.phone || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.mobile || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Status</p>
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                                {status?.name || "New"}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</p>
                                            <p className="text-sm font-medium text-slate-700">{industry?.name || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Owner</p>
                                            <p className="text-sm font-medium text-slate-700">{owner?.name || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* Company & Source */}
                                <CollapsibleDetailSection
                                    title="Company & Source"
                                    icon={<Building2 className="h-4 w-4" />}
                                    defaultOpen={true}
                                    className="border-slate-200"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.company || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p>
                                            <p className="text-sm font-medium text-blue-600 underline">{lead.website || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No of Employees</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.no_employees || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                                            <p className="text-sm font-medium text-slate-700">{source?.name || "Direct"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Medium</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.source_medium || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaign Name</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.campaign_name || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* Travel Requirements */}
                                <CollapsibleDetailSection
                                    title="Travel Requirements"
                                    icon={<Calendar className="h-4 w-4" />}
                                    defaultOpen={true}
                                    className="border-slate-200"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Travel Date</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.travel_date || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nights</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.no_of_nights || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pax</p>
                                            <p className="text-sm font-bold text-blue-700">{lead.no_of_pax || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixed Departure?</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.is_fixed ? "Yes" : "No"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {experiences.find((e: { id: string; name: string }) => e.id === lead.experience_id || e.name === lead.experience_id)?.name || lead.experience_id || "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destinations</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {lead.destinations && lead.destinations.length > 0 ? (
                                                    lead.destinations.map((dest, i) => (
                                                        <Badge key={i} variant="outline" className="bg-slate-50 text-xs text-slate-600 border-slate-200">
                                                            {dest}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-slate-400">-</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* Address Information */}
                                <CollapsibleDetailSection
                                    title="Address Information"
                                    icon={<MapPin className="h-4 w-4" />}
                                    defaultOpen={false}
                                    className="border-slate-200"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Country</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.country || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State/Province</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.state || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.city || "-"}</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Street Address</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.street || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* System Information */}
                                <CollapsibleDetailSection
                                    title="System Information"
                                    icon={<UserIcon className="h-4 w-4" />}
                                    defaultOpen={false}
                                    className="border-slate-200"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created By</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">{lead.created_by_name || "Unknown"}</p>
                                                <span className="text-slate-400 text-xs">at {formatDateTime(lead.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Modified By</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">{lead.last_modified_by_name || lead.created_by_name || "Unknown"}</p>
                                                <span className="text-slate-400 text-xs">at {formatDateTime(lead.updated_at)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">View Count</p>
                                            <Badge variant="secondary" className="font-mono text-[10px] h-4 px-1.5">{lead.view_count}</Badge>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>
                            </TabsContent>

                            <TabsContent value="activity" className="mt-0">
                                {/* Standard Activity components could go here, or simple timeline */}
                                <div className="p-4 border rounded-lg bg-slate-50/50">
                                    <p className="text-sm text-slate-500 italic">Activity history is shown in the sidebar.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                                    <Paperclip className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                    <p className="text-slate-500">No attachments found.</p>
                                    <Button variant="outline" size="sm" className="mt-4">Upload File</Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="w-full lg:w-[380px] flex-shrink-0 space-y-6">
                    {!lead.is_converted && (
                         <Button
                            className="w-full bg-green-600 hover:bg-green-700 font-bold h-11 text-sm shadow-md transition-all active:scale-95"
                            onClick={() => setIsConvertOpen(true)}
                        >
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            CONVERT LEAD
                        </Button>
                    )}

                    <EntityActivitySidebar
                        entityType="Lead"
                        entityId={lead.id}
                        entityName={lead.full_name}
                    />
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

            <LeadFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={(open) => {
                    setIsEditDrawerOpen(open);
                    if (!open) router.refresh();
                }}
                leadId={lead.id}
                initialData={lead}
                metadata={{
                    statuses: statuses,
                    sources: sources,
                    industries: industries,
                    experiences: experiences,
                }}
            />
        </div>
    );
}

