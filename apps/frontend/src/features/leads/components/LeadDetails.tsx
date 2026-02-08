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
    ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lead, LeadStatus, Source, User, Industry, Rating } from "../types";
import { ConvertLeadDialog } from "./ConvertLeadDialog";
import { format } from "date-fns";

interface LeadDetailsProps {
    lead: Lead;
    statuses: LeadStatus[];
    sources: Source[];
    users: User[];
    industries: Industry[];
    ratings: Rating[];
}

export function LeadDetails({ lead, statuses, sources, users, industries, ratings }: LeadDetailsProps) {
    const router = useRouter();
    const [isConvertOpen, setIsConvertOpen] = useState(false);

    const status = statuses.find(s => s.id === lead.lead_status_id);
    const source = sources.find(s => s.id === lead.source_id);
    const industry = industries.find(i => i.id === lead.industry_id);
    const rating = ratings.find(r => r.id === lead.rating_id);
    const owner = users.find(u => u.id === lead.owner_id);

    return (
        <div className="space-y-6">
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
                        <p className="text-muted-foreground">{lead.title} at {lead.company || "No Company"}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/leads/${lead.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    {!lead.is_converted ? (
                        <Button
                            className="bg-green-600 hover:bg-green-700"
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
                {/* Main Info Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-blue-500" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span>{lead.email || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>{lead.phone || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>{lead.mobile || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Website</p>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-slate-400" />
                                    <span className="text-blue-600 truncate">{lead.website || "N/A"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-indigo-500" />
                                Address Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1 md:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Street</p>
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                                    <span>{lead.street || "N/A"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">City</p>
                                <span>{lead.city || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">State/Province</p>
                                <span>{lead.state || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Zip/Postal Code</p>
                                <span>{lead.zip || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Country</p>
                                <span>{lead.country || "N/A"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Classification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                    {status?.name || "New"}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Lead Source</p>
                                <span className="text-sm">{source?.name || "Direct"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Industry</p>
                                <span className="text-sm">{industry?.name || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Rating</p>
                                <span className="text-sm">{rating?.name || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Lead Owner</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] uppercase font-bold text-slate-600">
                                        {owner?.name?.substring(0, 2) || "OW"}
                                    </div>
                                    <span className="text-sm">{owner?.name || "Unassigned"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">System Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Created At</span>
                                <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Last Modified</span>
                                <span>{format(new Date(lead.updated_at), "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">View Count</span>
                                <Badge variant="secondary" className="font-mono">{lead.view_count}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConvertLeadDialog
                lead={lead}
                open={isConvertOpen}
                onOpenChange={setIsConvertOpen}
                onSuccess={() => {
                    router.refresh();
                }}
            />
        </div>
    );
}
