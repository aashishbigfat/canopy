import { OpportunityForm } from "@/features/opportunities/components/OpportunityForm";

export default function CreateOpportunityPage({ 
    searchParams 
}: { 
    searchParams: { accountId?: string, contactId?: string } 
}) {
    return (
        <div className="space-y-6 max-w-2xl mx-auto py-8">
            <div>
                <h3 className="text-lg font-medium">Create Opportunity</h3>
                <p className="text-sm text-muted-foreground">
                    Track a new deal in your pipeline.
                </p>
            </div>
            <OpportunityForm 
                initialAccountId={searchParams.accountId} 
                initialContactId={searchParams.contactId} 
            />
        </div>
    );
}
