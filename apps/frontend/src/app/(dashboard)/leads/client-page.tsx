"use client";

import { LeadTable } from "@/features/leads/components/LeadTable";
import { useLeads } from "@/features/leads/api/useLeads";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function LeadsClientPage() {
    const searchParams = useSearchParams();
    
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = parseInt(searchParams.get("per_page") || "10");
    const search = searchParams.get("search") || undefined;
    const view = searchParams.get("view") || undefined;

    const { data: response, isLoading, error } = useLeads({
        page,
        per_page,
        search,
        view,
    });

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                        <p className="text-muted-foreground">
                            Track and manage your potential business opportunities.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/leads/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Lead
                        </Link>
                    </Button>
                </div>
                <div className="p-8 text-center">
                    <p className="text-red-600">Failed to load leads. Please try again.</p>
                </div>
            </div>
        );
    }

    if (!response) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                        <p className="text-muted-foreground">
                            Track and manage your potential business opportunities.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/leads/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Lead
                        </Link>
                    </Button>
                </div>
                <div className="p-8 text-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground">
                        Track and manage your potential business opportunities.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/leads/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Lead
                    </Link>
                </Button>
            </div>

            <LeadTable
                data={response.leads}
                pagination={response.pagination}
                lead_statuses={response.lead_statuses}
                sources={response.sources}
                users={response.users}
                isLoading={isLoading}
            />
        </div>
    );
}
