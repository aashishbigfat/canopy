import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, ExternalLink, IndianRupee } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";

interface RelatedOpportunitiesTabProps {
    accountId: string;
    opportunities: any[];
}

export function RelatedOpportunitiesTab({ accountId, opportunities }: RelatedOpportunitiesTabProps) {
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Related Opportunities</CardTitle>
                        <CardDescription>
                            Sales opportunities for this account • Total Value: {formatCurrency(totalValue)}
                        </CardDescription>
                    </div>
                    <Link href={`/opportunities/create?accountId=${accountId}`}>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Opportunity
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {opportunities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No opportunities for this account</p>
                        <Link href={`/opportunities/create?accountId=${accountId}`}>
                            <Button variant="outline" size="sm" className="mt-4">
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Opportunity
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Stage</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Travel Date</TableHead>
                                <TableHead>Pax</TableHead>
                                <TableHead>Probability</TableHead>
                                <TableHead>Close Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {opportunities.map((opp) => (
                                <TableRow key={opp.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/opportunities/${opp.id}`}
                                            className="hover:underline flex items-center gap-1"
                                        >
                                            {opp.name}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{opp.sales_stage_name || "Unknown"}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {formatCurrency(opp.amount)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {opp.industry_data?.travel_date
                                            ? formatDate(opp.industry_data.travel_date)
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {opp.industry_data?.no_of_pax || "-"}
                                    </TableCell>
                                    <TableCell>{opp.probability ? `${opp.probability}%` : "-"}</TableCell>
                                    <TableCell>
                                        {opp.close_date
                                            ? formatDate(opp.close_date)
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/opportunities/${opp.id}`}>
                                            <Button variant="ghost" size="sm">
                                                View
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
