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
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-white px-2 mb-6">
                <div className="relative flex-1 max-w-lg w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                    <Input 
                        placeholder="Search Itinerary" 
                        className="pl-10 h-10 w-full text-sm placeholder:text-slate-400 border-slate-200 focus:border-blue-500 rounded-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleCreateItinerary}
                        className="bg-indigo-100/50 hover:bg-indigo-200/50 text-indigo-700 h-10 font-medium px-4 shadow-none"
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
                    <div className="text-center text-slate-500 py-12">Loading...</div>
                ) : linkedItins.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg bg-slate-50/50">
                        <Map className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 font-medium">No itineraries attached</p>
                        <p className="text-slate-400 text-sm mt-1">Create or attach travel itineraries to plan the trip details.</p>
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
