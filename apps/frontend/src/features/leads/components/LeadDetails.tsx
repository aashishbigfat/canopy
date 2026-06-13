"use client";

import { useState, useEffect } from "react";
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
    Stethoscope,
    GraduationCap,
    Factory,
    LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { destinationsService } from "@/lib/api/services/destinations.service";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import { useIndustry, useIndustryLabels } from "@/lib/industry-labels";
import { VisitsByParentSection } from "@/features/bd/visits/components/VisitsByParentSection";
import { FileUploader } from "@/features/files/components/file-uploader";
import { FileList } from "@/features/files/components/file-list";

interface LeadDetailsProps {
    lead: Lead;
    statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    industries: Industry[];
    experiences?: { id: string; name: string }[];
    sales_stages?: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Industry-aware detail section dispatcher
// ---------------------------------------------------------------------------
function IndustryDetailSection({ industry, lead, experiences = [] }: { industry: string; lead: Lead; experiences?: { id: string; name: string }[] }) {
    const data = lead.industry_data || {};
    const [resolvedDestinations, setResolvedDestinations] = useState<string[]>([]);

    const destinationIdsStr = Array.isArray(data.destination_ids) ? data.destination_ids.join(",") : "";
    const destinationNamesStr = Array.isArray(data.destination_names) ? data.destination_names.join(",") : "";

    useEffect(() => {
        if (industry === "travel" && Array.isArray(data.destination_ids) && data.destination_ids.length > 0) {
            if (Array.isArray(data.destination_names) && data.destination_names.length === data.destination_ids.length) {
                setResolvedDestinations(data.destination_names);
                return;
            }
            let active = true;
            destinationsService.getDestinations({ limit: 1000 })
                .then(res => {
                    if (!active) return;
                    const destinationMap = new Map(res.destinations.map(d => [d.id, d.name]));
                    const resolved = data.destination_ids.map((id: string) => destinationMap.get(id) || id);
                    setResolvedDestinations(resolved);
                })
                .catch(err => {
                    console.error("Failed to resolve destination names", err);
                });
            return () => {
                active = false;
            };
        }
    }, [industry, destinationIdsStr, destinationNamesStr]);

    const sectionConfig: Record<string, { title: string; icon: React.ReactNode; borderColor: string; fields: { label: string; value: any }[] }> = {
        travel: {
            title: "Travel Requirements",
            icon: <Calendar className="h-4 w-4" />,
            borderColor: "border-blue-200",
            fields: [
                { label: "Travel Date", value: data.travel_date },
                {
                    label: "Destinations",
                    value: resolvedDestinations.length > 0
                        ? resolvedDestinations.join(", ")
                        : Array.isArray(data.destination_names) && data.destination_names.length > 0
                            ? data.destination_names.join(", ")
                            : Array.isArray(data.destination_ids) && data.destination_ids.length > 0
                                ? data.destination_ids.join(", ")
                                : null,
                },
                { label: "Nights", value: data.no_of_nights },
                { label: "Total Pax", value: data.no_of_pax },
                { label: "Adults", value: data.no_of_adults },
                { label: "Children", value: data.no_of_childs },
                { label: "Infants", value: data.no_of_infants },
                { label: "Fixed Departure?", value: data.is_fixed ? "Yes" : "No" },
                { label: "Experience", value: experiences.find(e => e.id === data.experience_id)?.name || data.experience_id },
            ],
        },
        healthcare: {
            title: "Clinical Details",
            icon: <Stethoscope className="h-4 w-4" />,
            borderColor: "border-emerald-200",
            fields: [
                { label: "Chief Complaint", value: data.chief_complaint },
                { label: "Urgency", value: data.urgency },
                { label: "Patient Type", value: data.patient_type },
                { label: "Referral Source", value: data.referral_source },
                { label: "Insurance Provider", value: data.insurance_provider },
                { label: "Policy Number", value: data.insurance_policy_number },
                { label: "Preferred Appointment", value: data.preferred_appointment_date },
            ],
        },
        education: {
            title: "Academic Details",
            icon: <GraduationCap className="h-4 w-4" />,
            borderColor: "border-violet-200",
            fields: [
                { label: "Highest Qualification", value: data.highest_qualification },
                { label: "GPA", value: data.gpa },
                { label: "Preferred Start Date", value: data.preferred_start_date },
                { label: "Nationality", value: data.nationality },
                { label: "Sponsorship Type", value: data.sponsorship_type },
                { label: "Scholarship Interest", value: data.scholarship_interest ? "Yes" : "No" },
            ],
        },
        manufacturing: {
            title: "Production Requirements",
            icon: <Factory className="h-4 w-4" />,
            borderColor: "border-orange-200",
            fields: [
                { label: "RFQ Number", value: data.rfq_number },
                { label: "Product Category", value: data.product_category },
                { label: "Estimated Quantity", value: data.estimated_quantity },
                { label: "Unit of Measure", value: data.unit_of_measure },
                { label: "Target Delivery Date", value: data.target_delivery_date },
                { label: "Budget Range", value: data.budget_range },
                { label: "Sample Required?", value: data.sample_required ? "Yes" : "No" },
                { label: "Technical Specs", value: data.technical_specs },
            ],
        },
    };

    const config = sectionConfig[industry] || sectionConfig.travel;

    return (
        <CollapsibleDetailSection
            title={config.title}
            icon={config.icon}
            defaultOpen={true}
            className={config.borderColor}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                {config.fields.map((f, i) => (
                    <div key={i} className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.label}</p>
                        <p className="text-sm font-medium text-slate-200">{f.value || "-"}</p>
                    </div>
                ))}
            </div>
        </CollapsibleDetailSection>
    );
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
    const queryClient = useQueryClient();
    const industry = useIndustry();
    const labels = useIndustryLabels();
    const [isConvertOpen, setIsConvertOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    // Track segment locally so the header badge updates immediately after editing
    const [currentSegment, setCurrentSegment] = useState<string>(lead.segment || "B2C");

    const changeOwnerMutation = useMutation({
        mutationFn: (newOwnerId: string) => leadsService.changeOwner(lead.id, newOwnerId),
        onSuccess: () => {
            toast.success("Owner changed successfully");
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            router.refresh();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || "Failed to change owner");
        },
    });

    // Sync whenever the server re-renders and passes a new lead prop (after router.refresh())
    useEffect(() => {
        setCurrentSegment(lead.segment || "B2C");
    }, [lead.segment, lead.id]);

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
    const leadIndustry = industries.find(i => i.id === lead.industry_id);
    const owner = users.find(u => u.id === lead.owner_id);

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl [&_.bg-white]:!bg-card [&_.border-slate-100]:!border-border [&_.border-slate-200]:!border-border [&_.border-slate-300]:!border-border [&_.text-slate-800]:!text-foreground [&_.text-slate-700]:!text-foreground [&_.text-slate-600]:!text-foreground/90 [&_.text-slate-500]:!text-muted-foreground [&_.text-slate-400]:!text-muted-foreground [&_.text-slate-300]:!text-muted-foreground">
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
                badge={currentSegment}
                name={lead.full_name}
                id={lead.id}
                phone={lead.phone || lead.mobile}
                email={lead.email}
                ownerName={owner?.name}
                ownerId={lead.owner_id}
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                onChangeOwner={(newOwnerId) => changeOwnerMutation.mutateAsync(newOwnerId)}
                isChangingOwner={changeOwnerMutation.isPending}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-11 p-0 gap-8">
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-blue-600"
                            >
                                Details
                            </TabsTrigger>

                            <TabsTrigger
                                value="attachments"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-blue-600"
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
                                    className="border-slate-700"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salutation</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.salutation || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.full_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                            <p className="text-sm font-medium text-blue-400 underline">{lead.email || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.phone || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.mobile || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Status</p>
                                            <Badge variant="outline" className="text-emerald-300 border-emerald-500/40 bg-emerald-500/20">
                                                {status?.name || "New"}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</p>
                                            <p className="text-sm font-medium text-slate-200">{leadIndustry?.name || industry || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Owner</p>
                                            <p className="text-sm font-medium text-slate-200">{owner?.name || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* Company & Source */}
                                <CollapsibleDetailSection
                                    title="Company & Source"
                                    icon={<Building2 className="h-4 w-4" />}
                                    defaultOpen={true}
                                    className="border-slate-700"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.company || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p>
                                            <p className="text-sm font-medium text-blue-400 underline">{lead.website || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No of Employees</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.no_employees || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                                            <p className="text-sm font-medium text-slate-200">{source?.name || "Direct"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Medium</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.source_medium || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaign Name</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.campaign_name || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>

                                {/* Industry-Specific Details */}
                                <IndustryDetailSection industry={industry} lead={lead} experiences={experiences} />

                                {/* Address Information */}
                                <CollapsibleDetailSection
                                    title="Address Information"
                                    icon={<MapPin className="h-4 w-4" />}
                                    defaultOpen={false}
                                    className="border-slate-700"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Country</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.country || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State/Province</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.state || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.city || "-"}</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Street Address</p>
                                            <p className="text-sm font-medium text-slate-200">{lead.street || "-"}</p>
                                        </div>
                                    </div>
                                </CollapsibleDetailSection>





                                {/* System Information */}
                                <CollapsibleDetailSection
                                    title="System Information"
                                    icon={<UserIcon className="h-4 w-4" />}
                                    defaultOpen={false}
                                    className="border-slate-700"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created By</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{lead.created_by_name || "Unknown"}</p>
                                                <span className="text-slate-400 text-xs">at {formatDateTime(lead.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Modified By</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{lead.last_modified_by_name || lead.created_by_name || "Unknown"}</p>
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



                            <TabsContent value="attachments" className="mt-0">
                                <div className="py-4 space-y-6">
                                    <FileUploader
                                        entityType="Lead"
                                        entityId={lead.id}
                                    />
                                    <FileList
                                        entityType="Lead"
                                        entityId={lead.id}
                                    />
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
                    source_mediums: [],
                    industries: industries,
                    experiences: experiences,
                }}
                onLeadUpdated={(updatedLead) => {
                    // Immediately update the segment badge without waiting for server re-render
                    if (updatedLead?.segment) {
                        setCurrentSegment(updatedLead.segment);
                    }
                }}
            />
        </div>
    );
}

