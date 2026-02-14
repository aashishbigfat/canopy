import { AccountTable } from "@/features/accounts/components/AccountTable";
import { accountService } from "../../../features/accounts/services/accountService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PersonAccountsPage() {
    const session = await getServerSession(authOptions);

    // Redirect to login if no session
    if (!session?.accessToken) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                        <p className="text-muted-foreground mb-4">Please log in to view person accounts.</p>
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const accounts = await accountService.getAccounts({ is_person_account: true }, {
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Person Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage individual customers and personal accounts.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/accounts/create?type=person">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Person Account
                    </Link>
                </Button>
            </div>

            <AccountTable data={accounts.accounts} />
        </div>
    );
}
