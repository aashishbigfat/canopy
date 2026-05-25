import { LoadingTable } from "@/components/ui/loading";

export default function OpportunitiesLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
                    <p className="text-muted-foreground">
                        Manage your sales pipeline and deals.
                    </p>
                </div>
                <div className="h-10 w-40 bg-slate-800 rounded-md animate-pulse" />
            </div>

            <div className="border rounded-lg">
                <LoadingTable rows={10} columns={5} />
            </div>
        </div>
    );
}
