"use client";

import { OpportunityForm } from "@/features/opportunities/components/OpportunityForm";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CreateOpportunityContent() {
    const searchParams = useSearchParams();
    const accountId = searchParams.get("accountId") || undefined;
    const contactId = searchParams.get("contactId") || undefined;

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">New Opportunity</h1>
                <p className="text-slate-500 text-sm">Fill in the details to create a new opportunity.</p>
            </div>
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <OpportunityForm 
                    initialAccountId={accountId} 
                    initialContactId={contactId}
                />
            </div>
        </div>
    );
}

export default function CreateOpportunityPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateOpportunityContent />
        </Suspense>
    );
}
