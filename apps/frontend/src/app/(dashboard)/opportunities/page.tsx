import { redirect } from "next/navigation";
import { OpportunityTable } from "@/features/opportunities/components/OpportunityTable";
import { opportunityService } from "../../../features/opportunities/services/opportunityService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function OpportunitiesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }
    const opportunities = await opportunityService.getOpportunities({}, {
        headers: {
            ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
                    <p className="text-muted-foreground">
                        Manage your sales pipeline and deals.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/opportunities/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Opportunity
                    </Link>
                </Button>
            </div>

            <OpportunityTable data={opportunities} />
        </div>
    );
}
