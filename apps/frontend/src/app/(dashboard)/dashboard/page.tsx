import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClientPage from "./client-page";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // Redirect to login if no session
    if (!session?.accessToken) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                        <p className="text-muted-foreground mb-4">Please log in to view dashboard.</p>
                        <a href="/login" className="text-blue-600 hover:underline">
                            Go to Login
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Return client component for authenticated users
    return <DashboardClientPage />;
}
