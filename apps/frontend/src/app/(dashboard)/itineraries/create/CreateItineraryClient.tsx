"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateItinerary } from "@/features/itineraries/api/useItineraries";
import { toast } from "sonner";
import { Map, Plus } from "lucide-react";

export default function CreateItineraryClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const opp_id = searchParams.get("opp_id");
    const createMutation = useCreateItinerary();
    
    const [formData, setFormData] = useState({
        name: "",
        tour_starts_from: "",
        tour_ends_same: true,
        total_nights: "",
        total_days: "",
        destination_ids: [] as string[],
        inclusions: [] as string[],
        overview: "",
    });

    const inclusionsList = ["Flights", "Accommodation", "Local Transfer"];

    const handleToggleInclusion = (item: string) => {
        setFormData(prev => {
            const list = [...prev.inclusions];
            if (list.includes(item)) {
                return { ...prev, inclusions: list.filter(i => i !== item) };
            } else {
                return { ...prev, inclusions: [...list, item] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name) {
            toast.error("Please provide an itinerary name");
            return;
        }

        try {
            const payload = {
                name: formData.name,
                tour_starts_from: formData.tour_starts_from,
                tour_ends_same: formData.tour_ends_same,
                total_nights: parseInt(formData.total_nights) || 0,
                total_days: parseInt(formData.total_days) || 0,
                destination_ids: formData.destination_ids, // Using string destination names right now as mock since we don't have destination IDs selection logic
                inclusions: formData.inclusions,
                overview: formData.overview,
                is_template: false,
                days: []
            };

            await createMutation.mutateAsync({ payload, opportunityId: opp_id || undefined });
            toast.success("Itinerary created successfully!");
            
            if (opp_id) {
                router.push(`/opportunities/${opp_id}`);
            } else {
                router.push("/itineraries");
            }
        } catch (error) {
            toast.error("Failed to create itinerary");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 max-w-[1400px] mx-auto space-y-6">
            <h1 className="text-2xl font-semibold text-slate-800">Create Itinerary</h1>

            <div className="grid lg:grid-cols-[1fr_400px] gap-8 bg-white p-6 rounded-lg shadow-sm">
                
                <div className="space-y-6">
                    {/* Itinerary Name */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-600 block">Itinerary Name</label>
                        <Input 
                            placeholder="Please type your tour name..." 
                            className="w-full bg-white"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Tour Start */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-600 block">Tour start</label>
                            <Input 
                                placeholder="Tour starts from" 
                                className="w-full bg-white" 
                                value={formData.tour_starts_from}
                                onChange={e => setFormData({ ...formData, tour_starts_from: e.target.value })}
                            />
                        </div>

                        {/* Tour End */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-600 flex items-center justify-between">
                                Tour End
                                <label className="flex items-center gap-2 cursor-pointer font-normal text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.tour_ends_same}
                                        onChange={e => setFormData({ ...formData, tour_ends_same: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-500 focus:ring-blue-500" 
                                    />
                                    Tour ends on same destination
                                </label>
                            </label>
                            {/* Disabled if end same */}
                            <Input 
                                placeholder="Tour ends on" 
                                className="w-full bg-slate-50"
                                disabled={formData.tour_ends_same}
                                value={formData.tour_ends_same ? formData.tour_starts_from : ""}
                                readOnly={formData.tour_ends_same}
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Tour Destinations */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-600">Tour Destinations</label>
                                <label className="flex items-center gap-2 cursor-pointer font-normal text-xs text-slate-600">
                                    <input type="checkbox" className="rounded border-slate-300 text-blue-500" />
                                    Search Destination
                                </label>
                            </div>
                            <div className="relative">
                                {/* Simulated autocomplete input */}
                                <Input 
                                    placeholder="Search Destination name here..." 
                                    className="w-full bg-white" 
                                />
                            </div>
                        </div>

                        {/* Tour Duration */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-600 block">Tour Duration</label>
                            <div className="flex items-center gap-4">
                                <Input 
                                    placeholder="No. of Night" 
                                    className="flex-1 bg-white" 
                                    type="number"
                                    min="0"
                                    value={formData.total_nights}
                                    onChange={e => setFormData({ ...formData, total_nights: e.target.value })}
                                />
                                <span className="text-slate-400 font-light text-2xl">/</span>
                                <Input 
                                    placeholder="No. of Days" 
                                    className="flex-1 bg-white" 
                                    type="number"
                                    min="0"
                                    value={formData.total_days}
                                    onChange={e => setFormData({ ...formData, total_days: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                        {/* Features */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-600">
                                Choose Feature Image <span className="text-amber-500">(Optional)</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <Button type="button" className="bg-[#48b5e5] hover:bg-[#3ba2cf] text-white">
                                    Tour feature image
                                </Button>
                                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded">No image selected</span>
                            </div>
                            <p className="text-xs text-red-500">
                                <span className="font-semibold">Note:</span> Choose feature image from your local computer <button type="button" className="text-blue-500 hover:underline">Click here</button>
                            </p>
                        </div>
                        
                        {/* Overview */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-600">
                                Tour Overview <span className="text-amber-500">(Optional)</span>
                            </label>
                            <div>
                                <Button type="button" className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">
                                    Add Overview
                                </Button>
                            </div>
                        </div>

                        {/* Tour Includes */}
                        <div className="space-y-3 md:col-start-2 border-t pt-4 mt-2">
                            <label className="text-sm font-medium text-slate-600 block mb-2">Tour Includes</label>
                            <div className="space-y-2">
                                {inclusionsList.map(item => (
                                    <label key={item} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500" 
                                            checked={formData.inclusions.includes(item)}
                                            onChange={() => handleToggleInclusion(item)}
                                        />
                                        {item}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Area Placeholder */}
                <div className="bg-[#a3b1a8] rounded flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 opacity-30 pointer-events-none" 
                         style={{ backgroundImage: 'radial-gradient(circle, #666 1px, transparent 1px)', backgroundSize: '10px 10px' }} 
                    />
                    <Map className="h-16 w-16 text-slate-600/50 mb-4" />
                    <span className="text-slate-800 font-semibold mb-1 z-10 text-center">For development purposes only</span>
                    <span className="text-slate-700 text-sm z-10">Map placeholder (feature to be added)</span>
                </div>
                
            </div>

            <div className="flex justify-end">
                <Button 
                    type="submit" 
                    className="bg-[#ffccdd] text-[#e0446b] hover:bg-[#ffb3cc] font-medium px-8 min-w-[150px]"
                    disabled={createMutation.isPending}
                >
                    {createMutation.isPending ? "Saving..." : "Save & Next"}
                </Button>
            </div>
            
            <div className="text-xs text-slate-400 text-center mt-12 py-4 border-t">
                Copyright © TutterflyCRM | All Rights Reserved.
                <div className="float-right space-x-4">
                    <a href="#" className="hover:text-slate-600">Terms of use</a>
                    <a href="#" className="hover:text-slate-600">Privacy Policy</a>
                </div>
            </div>
        </form>
    );
}
