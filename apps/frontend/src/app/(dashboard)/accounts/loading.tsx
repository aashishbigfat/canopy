import { LoadingTable } from "@/components/ui/loading";

export default function AccountsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage your customer accounts and companies.
                    </p>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
            </div>

            <div className="border rounded-lg">
                <LoadingTable rows={10} columns={5} />
            </div>
        </div>
    );
}
