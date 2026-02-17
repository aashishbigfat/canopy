import { LeadForm } from "@/features/leads/components/LeadForm";
import { leadsService } from "@/lib/api/services/leads.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EditLeadPage(props: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const params = await props.params;
    const leadId = params.id;
    // Parallel fetch for efficiency
    const [lead, metadataResponse] = await Promise.all([
        leadsService.getLead(leadId, { headers: { Authorization: `Bearer ${session.accessToken}` } }),
        leadsService.getLeads(
            { per_page: 1 },
            { headers: { Authorization: `Bearer ${session.accessToken}` } }
        )
    ]);

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Edit Lead</h3>
                <p className="text-sm text-muted-foreground">
                    Update the details of this lead.
                </p>
            </div>
            <LeadForm
                initialData={lead}
                leadId={leadId}
                statuses={metadataResponse.lead_statuses}
                sources={metadataResponse.sources}
                industries={metadataResponse.industries}
            />
        </div>
    );
}
