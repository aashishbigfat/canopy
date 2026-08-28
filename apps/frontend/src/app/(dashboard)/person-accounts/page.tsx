import { PersonAccountTable } from "@/features/accounts/components/PersonAccountTable";
import { accountService } from "../../../features/accounts/services/accountService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateAccountButton } from "@/features/accounts/components/CreateAccountButton";

export const dynamic = "force-dynamic";

export default async function PersonAccountsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; per_page?: string; search?: string; owner_id?: string; view_id?: string; billing_city?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const resolvedParams = await searchParams;
    const page = parseInt(resolvedParams.page || "1");
    const per_page = parseInt(resolvedParams.per_page || "10");
    const search = resolvedParams.search?.trim() || undefined;
    const owner_id = resolvedParams.owner_id?.trim() || undefined;
    const view_id = resolvedParams.view_id?.trim() || undefined;
    const billing_city = resolvedParams.billing_city?.trim() || undefined;

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
        { is_person_account: true, page, per_page, search, owner_id, view_id, billing_city },
        {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
        }
    );

    const accountViews = (accountsData as any).account_views ?? [];

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

            <div className="crm-surface overflow-hidden">
                <PersonAccountTable
                    data={accountsData.accounts}
                    pagination={accountsData.pagination}
                    views={accountViews}
                    activeViewId={view_id}
                    nextCursor={accountsData.next_cursor ?? null}
                    hasMore={accountsData.has_more ?? false}
                />
            </div>
        </div>
    );
}
