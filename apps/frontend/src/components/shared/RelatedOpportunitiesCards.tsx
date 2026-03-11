"use client";

import {
    Calendar,
    Users,
    Moon,
    ChevronRight,
    MapPin,
    IndianRupee,
    MoreVertical,
    Plus
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Opportunity {
    id: string;
    name: string;
    amount?: number;
    sales_stage_name?: string;
    no_of_pax?: number;
    no_of_nights?: number;
    travel_date?: string;
    close_date?: string;
}

interface RelatedOpportunitiesCardsProps {
    opportunities: Opportunity[];
    accountId?: string;
    contactId?: string;
}

export function RelatedOpportunitiesCards({ opportunities, accountId, contactId }: RelatedOpportunitiesCardsProps) {
    const createUrl = accountId
        ? `/opportunities/create?accountId=${accountId}`
        : contactId
            ? `/opportunities/create?contactId=${contactId}`
            : "/opportunities/create";

    if (!opportunities || opportunities.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50 flex flex-col items-center justify-center space-y-4">
                <p className="text-slate-500 font-medium">No opportunities associated yet.</p>
                <Button variant="outline" size="sm" asChild className="font-bold border-slate-200">
                    <Link href={createUrl}>Create Opportunity</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
                <Card key={opp.id} className="group hover:border-blue-300 transition-all shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <Link
                                    href={`/opportunities/${opp.id}`}
                                    className="text-sm font-bold text-blue-600 hover:underline block truncate max-w-[200px]"
                                >
                                    {opp.name}
                                </Link>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <MapPin className="h-3 w-3" />
                                    <span>Multiple Destinations</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-slate-50 rounded p-2 text-center">
                                <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                                    <Users className="h-3 w-3" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Pax</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{opp.no_of_pax || 0}</span>
                            </div>
                            <div className="bg-slate-50 rounded p-2 text-center">
                                <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                                    <Moon className="h-3 w-3" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Nights</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{opp.no_of_nights || 0}</span>
                            </div>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    <span>Travel: {opp.travel_date ? format(new Date(opp.travel_date), "MMM dd, yyyy") : "TBD"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-right">
                                    <Calendar className="h-3 w-3" />
                                    <span>Close: {opp.close_date ? format(new Date(opp.close_date), "MMM dd, yyyy") : "TBD"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                {opp.sales_stage_name || "Prospecting"}
                            </Badge>
                            {opp.amount && (
                                <span className="text-sm font-bold text-slate-900 flex items-center">
                                    <IndianRupee className="h-3 w-3" />
                                    {opp.amount.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Link
                href={createUrl}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 hover:bg-slate-50 hover:border-blue-300 transition-all group"
            >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900">New</span>
            </Link>
        </div>
    );
}
