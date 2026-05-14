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
            <DialogContent showCloseButton={false} className="max-w-[95vw] overflow-hidden rounded-lg border-border bg-card p-0 shadow-2xl sm:max-w-[95vw]">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <Briefcase className="h-4 w-4" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Opportunities({opportunities.length})
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 crm-icon-primary px-3 text-xs font-bold hover:bg-primary/25"
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
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="max-h-[75vh] overflow-x-hidden overflow-y-auto p-1">
                    <Table className="w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted/40">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="h-10 w-[18%] py-0 text-[12px] font-bold text-foreground">Name</TableHead>
                                <TableHead className="h-10 w-[14%] truncate py-0 text-[12px] font-bold text-foreground">Sales Stage</TableHead>
                                <TableHead className="h-10 w-[12%] py-0 text-right text-[12px] font-bold text-foreground">Amount</TableHead>
                                <TableHead className="h-10 w-[12%] py-0 text-center text-[11px] font-bold text-foreground">
                                    {industry === "travel" ? "No. Of Pax" : industry === "healthcare" ? "Urgency" : industry === "education" ? "GPA" : "Quantity"}
                                </TableHead>
                                <TableHead className="h-10 w-[14%] py-0 text-[12px] font-bold text-foreground">
                                    {industry === "travel" ? "Date of Travel" : "Key Date"}
                                </TableHead>
                                <TableHead className="h-10 w-[14%] py-0 text-[12px] font-bold text-foreground">Close Date</TableHead>
                                <TableHead className="h-10 w-[16%] py-0 text-[12px] font-bold text-foreground">Owner</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {opportunities.map((opp) => (
                                <TableRow key={opp.id} className="border-border hover:bg-muted/40">
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
                                            opp.sales_stage_name?.toLowerCase().includes('lost') ? "text-red-500" : "text-foreground/90"
                                        )}>
                                            {opp.sales_stage_name || "RECEIVED"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-bold text-foreground/90 text-[12px]">
                                        {opp.amount ? formatCurrency(opp.amount) : formatCurrency(0)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center font-bold text-foreground/90 text-[12px]">
                                        {(opp as any).industry_data?.no_of_pax || "0"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 whitespace-nowrap">
                                        {formatDate((opp as any).industry_data?.travel_date)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 whitespace-nowrap">
                                        {formatDate(opp.close_date)}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 truncate max-w-[150px]">
                                        {opp.owner_name || "Admin User"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end crm-dialog-footer">
                    <Button
                        variant="secondary"
                        className="h-9 border-none crm-icon-primary px-6 font-bold hover:bg-primary/25"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
