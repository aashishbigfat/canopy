"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Briefcase, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
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

interface OpportunitiesViewAllDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    opportunities: Opportunity[];
    accountId?: string;
    onNew?: () => void;
}

export function OpportunitiesViewAllDialog({
    open,
    onOpenChange,
    opportunities,
    accountId,
    onNew
}: OpportunitiesViewAllDialogProps) {
    const industry = useIndustry();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-[95vw] p-0 overflow-hidden border-none shadow-2xl rounded-lg">
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b bg-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <Briefcase className="h-4 w-4" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-700">
                            Opportunities({opportunities.length})
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 h-7 text-xs px-3 font-bold"
                            onClick={() => {
                                onOpenChange(false);
                                onNew?.();
                            }}
                        >
                            New
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden p-1">
                    <Table className="w-full">
                        <TableHeader className="bg-white sticky top-0 z-10 border-b">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[18%]">Name</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[14%] truncate">Sales Stage</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[12%] text-right">Amount</TableHead>
                                <TableHead className="text-[11px] font-bold text-slate-800 h-10 py-0 w-[12%] text-center">
                                    {industry === "travel" ? "No. Of Pax" : industry === "healthcare" ? "Urgency" : industry === "education" ? "GPA" : "Quantity"}
                                </TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[14%]">
                                    {industry === "travel" ? "Date of Travel" : "Key Date"}
                                </TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[14%]">Close Date</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[16%]">Owner</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {opportunities.map((opp) => (
                                <TableRow key={opp.id} className="hover:bg-slate-50 border-slate-100">
                                    <TableCell className="py-2 px-3">
                                        <Link 
                                            href={`/opportunities/${opp.id}`}
                                            className="text-[12px] font-bold text-blue-500 hover:underline block truncate max-w-[200px]"
                                            onClick={() => onOpenChange(false)}
                                        >
                                            {opp.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-2 px-3">
                                        <span className={cn(
                                            "text-[12px] font-bold block truncate max-w-[120px]",
                                            opp.sales_stage_name?.toLowerCase().includes('lost') ? "text-red-500" : "text-slate-600"
                                        )}>
                                            {opp.sales_stage_name || "RECEIVED"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-bold text-slate-600 text-[12px]">
                                        {opp.amount ? formatCurrency(opp.amount) : formatCurrency(0)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center font-bold text-slate-600 text-[12px]">
                                        {(opp as any).industry_data?.no_of_pax || "0"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 whitespace-nowrap">
                                        {formatDate((opp as any).industry_data?.travel_date)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 whitespace-nowrap">
                                        {formatDate(opp.close_date)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 truncate max-w-[150px]">
                                        {opp.owner_name || "Admin User"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 border-t bg-white flex justify-end">
                    <Button 
                        variant="secondary" 
                        className="bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border-none px-6 font-bold h-9"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
