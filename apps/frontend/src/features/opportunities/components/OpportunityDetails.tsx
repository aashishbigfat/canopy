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
    TrendingUp,
    DollarSign,
    Target,
    Map
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Opportunity } from "../types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { UpdateStageDialog } from "./UpdateStageDialog";

interface OpportunityDetailsProps {
    opportunity: Opportunity;
    stages?: { id: string; name: string }[];
}

export function OpportunityDetails({
    opportunity,
    stages = []
}: OpportunityDetailsProps) {
    const router = useRouter();
    const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
    const stage = stages.find(s => s.id === opportunity.sales_stage_id);

    return (
        <div className="space-y-6">
            <UpdateStageDialog
                opportunityId={opportunity.id}
                currentStageId={opportunity.sales_stage_id}
                stages={stages}
                isOpen={isStageDialogOpen}
                onClose={() => setIsStageDialogOpen(false)}
            />
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href="/opportunities">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{opportunity.name}</h1>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {stage?.name || "Prospecting"}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {opportunity.account_name || "Personal Account"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/opportunities/${opportunity.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 font-medium"
                        size="sm"
                        onClick={() => setIsStageDialogOpen(true)}
                    >
                        Update Stage
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Deal Overview */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                Deal Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Amount</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : "$0"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Probability</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-semibold">{opportunity.probability || 0}%</span>
                                    <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${opportunity.probability || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Expected Close Date</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium">
                                        {opportunity.close_date ? format(new Date(opportunity.close_date), "PPP") : "Not Set"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Opportunity Owner</p>
                                <p className="text-sm font-medium">{opportunity.owner_name || "Unassigned"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Travel Details */}
                    <Card className="border-blue-100 bg-blue-50/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Map className="h-5 w-5 text-blue-600" />
                                Travel Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Travel Date</p>
                                <p className="text-sm font-semibold">{opportunity.travel_date ? format(new Date(opportunity.travel_date), "dd MMM yyyy") : "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">No of Pax</p>
                                <p className="text-sm font-semibold">{opportunity.no_of_pax || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Segment</p>
                                <Badge variant="secondary" className="capitalize">
                                    {opportunity.segment || "B2C"}
                                </Badge>
                            </div>
                            <div className="space-y-1 col-span-2 lg:col-span-3 pt-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Destinations</p>
                                <div className="flex flex-wrap gap-2">
                                    {opportunity.destination_names && opportunity.destination_names.length > 0 ? (
                                        opportunity.destination_names.map((dest, i) => (
                                            <Badge key={i} variant="outline" className="bg-white px-3 py-1">
                                                {dest}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500">No destinations specified</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Classification */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Classification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Sales Stage</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <span className="text-sm font-medium">{stage?.name || "Open"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Creation Type</p>
                                <Badge variant={opportunity.creation_type === "Auto" ? "default" : "secondary"}>
                                    {opportunity.creation_type || "Manual"}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Lead Source</p>
                                <p className="text-sm">{opportunity.type || "Direct"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">System Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground uppercase">Created</span>
                                <span>{opportunity.created_at ? format(new Date(opportunity.created_at), "MMM d, yyyy") : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground uppercase">Modified</span>
                                <span>{opportunity.updated_at ? format(new Date(opportunity.updated_at), "MMM d, yyyy") : "-"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
