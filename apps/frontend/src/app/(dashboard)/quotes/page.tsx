"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
    Plus,
    Search,
    FileText,
    MoreHorizontal,
    Pencil,
    Trash2,
    Loader2,
    Calendar,
    Download
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { quotesService } from "@/lib/api/services/quotes.service";
import { generateQuotePdf, QuoteData } from "@/lib/pdf/generateQuotePdf";

export default function QuotesPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["quotes", searchQuery],
        queryFn: () => quotesService.getQuotes({ search: searchQuery }),
    });

    const deleteMutation = useMutation({
        mutationFn: quotesService.deleteQuote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            toast.success("Quote deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete quote");
        },
    });

    const handleDownloadPdf = async (id: string) => {
        try {
            setIsGeneratingPdf(id);
            const quoteDetail = await quotesService.getQuote(id);

            const pdfData: QuoteData = {
                quote_number: quoteDetail.quote_number,
                title: quoteDetail.name,
                status: quoteDetail.status,
                valid_until: quoteDetail.valid_until,
                created_at: quoteDetail.created_at,
                // We'd need to fetch account/contact names if they aren't in the quote object
                // For now, using placeholders or data if available
                subtotal: quoteDetail.subtotal,
                discount_percent: quoteDetail.discount_percent,
                discount_amount: quoteDetail.discount_amount,
                tax_percent: quoteDetail.tax_percent,
                tax_amount: quoteDetail.tax_amount,
                total: quoteDetail.total,
                terms_and_conditions: quoteDetail.terms_and_conditions,
                items: quoteDetail.items.map(item => ({
                    id: item.id,
                    product_name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percent: item.discount_percent,
                    total: item.total
                }))
            };

            generateQuotePdf(pdfData);
            toast.success("PDF generated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    const quotes = data?.data || [];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "draft": return "secondary";
            case "sent": return "default"; // blue/primary
            case "accepted": return "success"; // green usually, but using default variants for now
            case "rejected": return "destructive";
            case "expired": return "outline";
            default: return "secondary";
        }
    };


    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Quotes</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your sales quotes and estimates.
                    </p>
                </div>
                <Link href="/quotes/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Quote
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="crm-toolbar max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search quotes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0"
                />
            </div>

            {/* Quotes Table */}
            <div className="crm-surface overflow-hidden p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : quotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No quotes found</p>
                            <p className="text-sm">Create your first quote to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quote Number</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotes.map((quote) => (
                                    <TableRow key={quote.id}>
                                        <TableCell>
                                            <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline text-primary">
                                                {quote.quote_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{quote.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(quote.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(quote.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={getStatusColor(quote.status) as any}>
                                                {quote.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDownloadPdf(quote.id)}>
                                                        {isGeneratingPdf === quote.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="mr-2 h-4 w-4" />
                                                        )}
                                                        Download PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/quotes/${quote.id}`}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => deleteMutation.mutate(quote.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
            </div>
        </div>
    );
}
