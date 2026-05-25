import { LoadingTable } from "@/components/ui/loading";

export default function LeadsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground">
                        Track and manage your potential business opportunities.
                    </p>
                </div>
                <div className="h-10 w-32 bg-slate-800 rounded-md animate-pulse" />
            </div>

            <div className="border rounded-lg">
                <LoadingTable rows={10} columns={5} />
            </div>
        </div>
    );
}
