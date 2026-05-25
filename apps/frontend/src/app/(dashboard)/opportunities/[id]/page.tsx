import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

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
                    <Link href="/opportunities" className="text-blue-400 hover:underline text-sm">← Back to Opportunities</Link>
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
    } catch (error: unknown) {
        const isConnectionError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "ECONNREFUSED";

        console.error("Error fetching opportunity data:", error);

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <h2 className="text-2xl font-semibold text-red-400">
                    {isConnectionError ? "Backend Unavailable" : "Error Loading Opportunity"}
                </h2>
                <p className="text-slate-300 text-sm max-w-md text-center">
                    {isConnectionError
                        ? "Could not connect to the backend server. Please ensure the backend is running and try again."
                        : "There was a problem loading the opportunity data. Please try again later."}
                </p>
                <div className="flex gap-4">
                    <Link
                        href={`/opportunities/${id}`}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
                    >
                        Retry
                    </Link>
                    <Link
                        href="/opportunities"
                        className="inline-flex items-center gap-1 text-slate-300 hover:text-slate-100 text-sm px-4 py-2 rounded-md border border-slate-700 hover:bg-slate-800/40 transition-colors"
                    >
                        ← Back to Opportunities
                    </Link>
                </div>
            </div>
        );
    }
}
