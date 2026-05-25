"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, MoreHorizontal, FileText, Mail, Copy, Trash2, Edit } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useItineraries, useDeleteItinerary } from "@/features/itineraries/api/useItineraries";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ItinerariesClient() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: itineraries, isLoading } = useItineraries();
    const deleteMutation = useDeleteItinerary();
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this itinerary?")) {
            try {
                await deleteMutation.mutateAsync(id);
                toast.success("Itinerary deleted successfully");
            } catch (error) {
                toast.error("Failed to delete itinerary");
            }
        }
    };

    const filteredItineraries = itineraries?.filter(itinerary => 
        itinerary.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="flex-1 min-w-0 w-full space-y-6 max-w-[1400px] mx-auto p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Itineraries</h1>

            <Card className="border-slate-700 shadow-sm min-w-0 w-full">
                <CardHeader className="bg-slate-800/60 border-b border-slate-700 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-100">Itinerary Builder</CardTitle>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search"
                                className="pl-9 h-9 w-full sm:w-[250px] text-sm bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Link href="/itineraries/create" className="shrink-0">
                            <Button size="icon" className="h-9 w-9 bg-blue-500 hover:bg-blue-600">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto scrollbar-hide">
                        <Table>
                            <TableHeader className="bg-slate-800/40 whitespace-nowrap">
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="font-semibold text-slate-300">Itinerary Name</TableHead>
                                    <TableHead className="font-semibold text-slate-300">Starts From</TableHead>
                                    <TableHead className="font-semibold text-slate-300">Destinations</TableHead>
                                    <TableHead className="font-semibold text-slate-300">Durations</TableHead>
                                    <TableHead className="font-semibold text-slate-300">Created On</TableHead>
                                    <TableHead className="font-semibold text-slate-300 w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-300">Loading itineraries...</TableCell>
                                    </TableRow>
                                ) : filteredItineraries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">No itineraries found</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItineraries.map((itinerary) => (
                                        <TableRow key={itinerary.id} className="border-slate-700 hover:bg-slate-800/40 block sm:table-row">
                                            <TableCell className="block sm:table-cell">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-300 text-center leading-tight border border-slate-600 shrink-0">
                                                        ID<br/>BLD
                                                    </div>
                                                    <Link href={`/itineraries/${itinerary.id}`} className="text-blue-400 hover:text-blue-300 hover:underline font-medium break-words">
                                                        {itinerary.name}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-300 block sm:table-cell whitespace-nowrap">
                                                {itinerary.tour_starts_from || "-"}
                                            </TableCell>
                                            <TableCell className="text-slate-300 font-medium block sm:table-cell whitespace-nowrap">
                                                {itinerary.destination_ids?.length > 0 ? `${itinerary.destination_ids.length} Destination(s)` : "-"}
                                            </TableCell>
                                            <TableCell className="text-slate-300 block sm:table-cell whitespace-nowrap">
                                                {itinerary.total_nights || 0} N / {itinerary.total_days || 0} D
                                            </TableCell>
                                            <TableCell className="text-slate-300 block sm:table-cell whitespace-nowrap">
                                                {itinerary.created_at ? format(new Date(itinerary.created_at), "dd MMM yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="block sm:table-cell text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="h-8 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40 pr-2">
                                                            Action <MoreHorizontal className="h-4 w-4 ml-1" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem onClick={() => router.push(`/itineraries/${itinerary.id}/edit`)}>
                                                            <Edit className="h-4 w-4 mr-2 text-slate-400" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <FileText className="h-4 w-4 mr-2 text-slate-400" /> Preview & Generate Pdf
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Mail className="h-4 w-4 mr-2 text-slate-400" /> E-mail Itinerary
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Copy className="h-4 w-4 mr-2 text-slate-400" /> Copy
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => handleDelete(itinerary.id)}
                                                            className="text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
