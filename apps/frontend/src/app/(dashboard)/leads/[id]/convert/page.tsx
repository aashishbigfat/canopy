import { LeadForm } from "@/features/leads/components/LeadForm";
import { leadsService } from "@/lib/api/services/leads.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ConvertLeadPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        redirect("/login");
    }

    const leadId = params.id;

    try {
        // Get lead data for pre-filling the form
        const lead = await leadsService.getLead(leadId);

        // Get statuses and sources for dropdowns
        const response = await leadsService.getLeads({ per_page: 1 });

        return (
            <div className="space-y-6 max-w-2xl">
                <div>
                    <h3 className="text-lg font-medium">Convert Lead to Opportunity</h3>
                    <p className="text-sm text-muted-foreground">
                        Convert this lead into an opportunity and optionally create a contact.
                    </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Converting this lead will mark it as converted and create a new opportunity.
                    </p>
                </div>
                <LeadForm
                    initialData={lead}
                    leadId={leadId}
                    statuses={response.lead_statuses}
                    sources={response.sources}
                />
            </div>
        );
    } catch (error) {
        console.error("Failed to load lead for conversion:", error);
        redirect("/leads");
    }
}
