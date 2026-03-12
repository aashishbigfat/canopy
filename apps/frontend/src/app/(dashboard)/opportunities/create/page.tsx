import { OpportunityForm } from "@/features/opportunities/components/OpportunityForm";

export default async function CreateOpportunityPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ accountId?: string, contactId?: string }> 
}) {
    const params = await searchParams;
    return (
        <div className="space-y-6 max-w-2xl mx-auto py-8">
            <div>
                <h3 className="text-lg font-medium">Create Opportunity</h3>
                <p className="text-sm text-muted-foreground">
                    Track a new deal in your pipeline.
                </p>
            </div>
            <OpportunityForm 
                initialAccountId={params.accountId} 
                initialContactId={params.contactId} 
            />
        </div>
    );
}
