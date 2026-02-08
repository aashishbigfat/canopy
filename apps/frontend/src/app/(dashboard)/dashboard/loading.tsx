import { LoadingCard, LoadingSkeleton } from "@/components/ui/loading";

export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your business performance.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded-md animate-pulse w-1/4" />
                    <div className="h-[300px] bg-gray-100 rounded-md animate-pulse w-full" />
                </div>
                <div className="col-span-3 border rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded-md animate-pulse w-1/3" />
                    <LoadingSkeleton lines={6} />
                </div>
            </div>
        </div>
    );
}
