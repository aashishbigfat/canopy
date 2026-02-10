import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { OpportunityDetails } from "@/features/opportunities/components/OpportunityDetails";

export const dynamic = "force-dynamic";

interface OpportunityPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function OpportunityPage(props: OpportunityPageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const params = await props.params;
    const { id } = params;

    try {
        const [opportunity, stagesResponse] = await Promise.all([
            opportunitiesService.getOpportunity(id, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
            opportunitiesService.getSalesStages({ headers: { Authorization: `Bearer ${session.accessToken}` } })
        ]);

        if (!opportunity) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <h2 className="text-2xl font-semibold">Opportunity not found</h2>
                    <p className="text-muted-foreground">The opportunity you are looking for does not exist or has been deleted.</p>
                </div>
            );
        }

        return (
            <div className="container mx-auto py-6">
                <OpportunityDetails
                    opportunity={opportunity}
                    stages={stagesResponse}
                />
            </div>
        );
    } catch (error) {
        console.error("Error fetching opportunity data:", error);
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-red-600">
                <h2 className="text-2xl font-semibold">Error Loading Opportunity</h2>
                <p>There was a problem loading the opportunity data. Please try again later.</p>
            </div>
        );
    }
}
