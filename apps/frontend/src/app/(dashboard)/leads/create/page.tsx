import { LeadForm } from "@/features/leads/components/LeadForm";
import { leadsService } from "@/lib/api/services/leads.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CreateLeadPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const response = await leadsService.getLeads(
        { per_page: 1 },
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Create Lead</h3>
                <p className="text-sm text-muted-foreground">
                    Enter lead details to start tracking a new opportunity.
                </p>
            </div>
            <LeadForm
                statuses={response.lead_statuses}
                sources={response.sources}
                industries={response.industries}
                ratings={response.ratings}
            />
        </div>
    );
}
