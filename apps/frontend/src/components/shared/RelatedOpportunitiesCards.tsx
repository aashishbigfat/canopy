"use client";

import {
    Calendar,
    Users,
    Moon,
    ChevronRight,
    MapPin,
    IndianRupee,
    MoreVertical,
    Plus,
    Briefcase,
    User,
    Target
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/lib/industry-labels";

interface Opportunity {
    id: string;
    name: string;
    amount?: number;
    sales_stage_name?: string;
    close_date?: string;
    owner_name?: string;
    industry_data?: Record<string, any>;
}

interface RelatedOpportunitiesCardsProps {
    opportunities: Opportunity[];
    accountId?: string;
    contactId?: string;
    onNewClick?: () => void;
}

export function RelatedOpportunitiesCards({ opportunities, accountId, contactId, onNewClick }: RelatedOpportunitiesCardsProps) {
    const industry = useIndustry();
    const createUrl = accountId
        ? `/opportunities/create?accountId=${accountId}`
        : contactId
            ? `/opportunities/create?contactId=${contactId}`
            : "/opportunities/create";

    if (!opportunities || opportunities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 crm-empty-state">
                <p className="font-medium text-foreground">No opportunities associated yet.</p>
                <Button 
                    variant="outline" 
                    size="sm" 
                    asChild={!onNewClick} 
                    onClick={onNewClick}
                    className="border-border font-bold"
                >
                    {onNewClick ? (
                        <span>Create Opportunity</span>
                    ) : (
                        <Link href={createUrl}>Create Opportunity</Link>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp) => (
                <Card key={opp.id} className="group overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all hover:border-blue-400/60 hover:shadow-md">
                    <CardContent className="p-3">
                        <div className="mb-0.5">
                            <Link
                                href={`/opportunities/${opp.id}`}
                                className="text-[13px] text-blue-500 hover:underline block truncate font-bold leading-tight"
                            >
                                {opp.name}
                            </Link>
                        </div>
                        
                        <div className="mt-2.5 space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Briefcase className="h-[13px] w-[13px] shrink-0" />
                                <span className="truncate text-[11px] font-semibold text-muted-foreground">{opp.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-[13px] w-[13px] shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/90">
                                    {industry === "travel" ? (((opp as any).industry_data?.no_of_pax || (opp as any).no_of_pax || 0)) + " pax" : opp.sales_stage_name || "—"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-[13px] w-[13px] shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/90">
                                    {industry === "travel"
                                        ? (((opp as any).industry_data?.travel_date || (opp as any).travel_date) ? format(new Date(((opp as any).industry_data?.travel_date || (opp as any).travel_date)), "dd MMM yyyy") : "TBD")
                                        : (opp.close_date ? format(new Date(opp.close_date), "dd MMM yyyy") : "TBD")
                                    }
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Target className="h-[13px] w-[13px] shrink-0 text-slate-500" />
                                <span className={cn(
                                    "text-[11px] font-bold",
                                    opp.sales_stage_name?.toLowerCase().includes('lost') ? "text-red-500" : "text-blue-500"
                                )}>
                                    {opp.sales_stage_name || "RECEIVED"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-[13px] w-[13px] shrink-0" />
                                <span className="truncate text-[11px] font-semibold text-foreground/90">{opp.owner_name || "Admin User"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
