import { LeadForm } from "@/features/leads/components/LeadForm";
import { leadsService } from "@/lib/api/services/leads.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EditLeadPage(props: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        redirect("/login");
    }

    const params = await props.params;
    const leadId = params.id;

    try {
        // Parallel fetch for efficiency
        const [lead, metadataResponse] = await Promise.all([
            leadsService.getLead(leadId, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
            }),
            leadsService.getLeads(
                { per_page: 1 },
                { headers: { Authorization: `Bearer ${session.accessToken}` } }
            ),
        ]);

        return (
            <div className="container mx-auto py-6 space-y-6">
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
                    source_mediums={metadataResponse.source_mediums}
                    industries={metadataResponse.industries}
                    experiences={metadataResponse.experiences}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load lead for editing:", error);
        redirect("/leads");
    }
}
