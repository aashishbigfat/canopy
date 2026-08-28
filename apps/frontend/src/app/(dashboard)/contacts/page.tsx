import { ContactTable } from "@/features/contacts/components/ContactTable";
import { contactsService } from "@/lib/api/services/contacts.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateContactButton } from "@/features/contacts/components/CreateContactButton";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; per_page?: string; search?: string; owner_id?: string; view_id?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const resolvedParams = await searchParams;
    const page = parseInt(resolvedParams.page || "1");
    const per_page = parseInt(resolvedParams.per_page || "10");
    const search = resolvedParams.search?.trim() || undefined;
    const owner_id = resolvedParams.owner_id?.trim() || undefined;
    const view_id = resolvedParams.view_id?.trim() || undefined;

    // Redirect to login if no session
    if (!session?.accessToken) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
                        <p className="text-muted-foreground mb-4">Please log in to view contacts.</p>
                        <Link href="/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const contactsData = await contactsService.getContacts(
        { page, per_page, search, owner_id, view_id },
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
                    <h1>Contacts</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your key contacts and people.
                    </p>
                </div>
                <PermissionGate permission="create_contact">
                    <CreateContactButton />
                </PermissionGate>
            </div>

            <div className="crm-surface overflow-hidden">
                <ContactTable
                    data={contactsData.contacts}
                    pagination={contactsData.pagination}
                    users={contactsData.users}
                    nextCursor={contactsData.next_cursor ?? null}
                    hasMore={contactsData.has_more ?? false}
                />
            </div>
        </div>
    );
}
