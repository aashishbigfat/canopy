"use client";

import { useState } from "react";
import { Search, Map, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOpportunityItineraries } from "@/features/itineraries/api/useItineraries";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OpportunityItinerariesTabProps {
    opportunityId: string;
}

export function OpportunityItinerariesTab({ opportunityId }: OpportunityItinerariesTabProps) {
    const router = useRouter();
    const { data: itineraries, isLoading } = useOpportunityItineraries(opportunityId);
    const [searchQuery, setSearchQuery] = useState("");

    const linkedItins = itineraries || [];

    const handleCreateItinerary = () => {
        router.push(`/itineraries/create?opp_id=${opportunityId}`);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
                <div className="relative flex-1 max-w-lg w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                    <Input 
                        placeholder="Search Itinerary" 
                        className="h-10 w-full rounded-md border-border bg-background pl-10 text-sm placeholder:text-muted-foreground focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleCreateItinerary}
                        className="h-10 crm-icon-primary px-4 font-medium shadow-none hover:bg-primary/25"
                    >
                        Create Itinerary
                    </Button>
                    <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium px-6 shadow-sm flex gap-2 items-center"
                    >
                        <Paperclip className="h-4 w-4" />
                        Attach
                    </Button>
                </div>
            </div>

            <div className="min-h-[150px]">
                {isLoading ? (
                    <div className="text-center text-muted-foreground py-12">Loading...</div>
                ) : linkedItins.length === 0 ? (
                    <div className="crm-empty-state">
                        <Map className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                        <p className="font-medium text-foreground">No itineraries attached</p>
                        <p className="mt-1 text-sm text-muted-foreground">Create or attach travel itineraries to plan the trip details.</p>
                    </div>
                ) : (
                    <div className="flex gap-2 flex-wrap pb-4">
                        {linkedItins.filter(item => item.itinerary.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                            <div key={item.itinerary.id} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-2 cursor-pointer hover:bg-indigo-100">
                                {item.itinerary.name}
                                <span className="text-indigo-400 hover:text-indigo-800 ml-1">×</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
