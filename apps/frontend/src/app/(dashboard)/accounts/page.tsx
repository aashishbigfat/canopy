import { AccountTable } from "@/features/accounts/components/AccountTable";
import { accountService } from "../../../features/accounts/services/accountService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function AccountsPage() {
    const session = await getServerSession(authOptions);

    // Redirect to login if no session
    if (!session?.accessToken) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                        <p className="text-muted-foreground mb-4">Please log in to view accounts.</p>
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const accounts = await accountService.getAccounts({}, {
        headers: {
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage your customer accounts and companies.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/accounts/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Account
                    </Link>
                </Button>
            </div>

            <AccountTable data={accounts.accounts} />
        </div>
    );
}
