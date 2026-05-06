import { AccountTable } from "@/features/accounts/components/AccountTable";
import { accountService } from "../../../features/accounts/services/accountService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EntityListToolbar } from "@/features/views/EntityListToolbar";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; per_page?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const resolvedParams = await searchParams;
    const page = parseInt(resolvedParams.page || "1");
    const per_page = parseInt(resolvedParams.per_page || "10");

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

    const accountsData = await accountService.getAccounts(
        { is_person_account: false, page, per_page },
        {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
        }
    );

    return (
        <div className="crm-page">
            <div className="crm-surface px-4 py-3">
                <div>
                    <h1>Accounts</h1>
                    <p className="text-sm text-muted-foreground">Manage company records, ownership, and account activity.</p>
                </div>
            </div>

            <EntityListToolbar entity="account" />

            <div className="crm-surface overflow-hidden">
                <AccountTable
                    data={accountsData.accounts} 
                    pagination={accountsData.pagination} 
                />
            </div>
        </div>
    );
}
