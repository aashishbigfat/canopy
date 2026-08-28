import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { leadsService } from "@/lib/api/services/leads.service";
import { LeadDetails } from "@/features/leads/components/LeadDetails";

export const dynamic = "force-dynamic";

interface LeadPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function LeadPage(props: LeadPageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const params = await props.params;
    const { id } = params;

    try {
        // Fetch lead and supporting data for the details view
        const [lead, metadataResponse] = await Promise.all([
            leadsService.getLead(id, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
            // We fetch the metadata through getLeads with per_page: 1 as a shortcut 
            // since the backend returns statuses/sources/users in the response
            leadsService.getLeads(
                { per_page: 1 },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            )
        ]);

        if (!lead) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                    <h2 className="text-2xl font-semibold">Lead not found</h2>
                    <p className="text-muted-foreground">The lead you are looking for does not exist or has been deleted.</p>
                </div>
            );
        }

        return (
            <div className="container mx-auto py-6">
                <LeadDetails
                    lead={lead}
                    statuses={metadataResponse.lead_statuses}
                    sources={metadataResponse.sources}
                    users={metadataResponse.users}
                    industries={metadataResponse.industries}
                    experiences={metadataResponse.experiences}
                    sales_stages={metadataResponse.sales_stages}
                />
            </div>
        );
    } catch (error: any) {
        console.error("Error fetching lead data:", error);
        // If lead is not found (converted/deleted), redirect to leads list
        const status = error?.response?.status ?? error?.status;
        if (status === 404 || status === 410) {
            redirect("/leads");
        }
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-red-600">
                <h2 className="text-2xl font-semibold">Error Loading Lead</h2>
                <p>There was a problem loading the lead data. Please try again later.</p>
            </div>
        );
    }
}
