import { AccountForm } from "@/features/accounts/components/AccountForm";
import { accountService } from "@/features/accounts/services/accountService";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

interface EditPersonAccountPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPersonAccountPage(props: EditPersonAccountPageProps) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return null;
    }

    let account = null;
    try {
        account = await accountService.getAccount(params.id, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        });
    } catch (error) {
        console.error("Error fetching account:", error);
        notFound();
    }

    if (!account) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Edit Person Account</h1>
                <p className="text-muted-foreground">Update the details for {account.name}</p>
            </div>
            <div className="bg-white rounded-lg border p-6">
                <AccountForm
                    id={params.id}
                    isPersonAccount={true}
                    initialData={account}
                />
            </div>
        </div>
    );
}
