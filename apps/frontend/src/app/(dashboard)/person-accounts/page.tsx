import { PersonAccountTable } from "@/features/accounts/components/PersonAccountTable";
import { accountService } from "../../../features/accounts/services/accountService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateAccountButton } from "@/features/accounts/components/CreateAccountButton";
import { EntityListToolbar } from "@/features/views/EntityListToolbar";

export const dynamic = "force-dynamic";

export default async function PersonAccountsPage({
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
                        <p className="text-muted-foreground mb-4">Please log in to view person accounts.</p>
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const accountsData = await accountService.getAccounts(
        { is_person_account: true, page, per_page },
        {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
        }
    );

    return (
        <div className="crm-page">
            <div className="crm-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Person Accounts</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage individual customers and personal accounts.
                    </p>
                </div>
                <CreateAccountButton isPerson />
            </div>

            <EntityListToolbar entity="personal_account" />

            <div className="crm-surface overflow-hidden">
                <PersonAccountTable
                    data={accountsData.accounts}
                    pagination={accountsData.pagination}
                />
            </div>
        </div>
    );
}
