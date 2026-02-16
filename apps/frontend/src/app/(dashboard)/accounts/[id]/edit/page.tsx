import { AccountForm } from "@/features/accounts/components/AccountForm";
import { accountService } from "@/features/accounts/services/accountService";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

interface EditAccountPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditAccountPage(props: EditAccountPageProps) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return null;
    }

    const account = await accountService.getAccount(params.id);

    if (!account) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Edit Account</h1>
                <p className="text-muted-foreground">Update the details for {account.name}</p>
            </div>
            <div className="bg-white rounded-lg border p-6">
                <AccountForm
                    id={params.id}
                    initialData={{
                        name: account.name,
                        industry: account.industry_name || "",
                        website: account.website || "",
                        phone: account.phone || "",
                        status: "active", // Default to active for now
                    }}
                />
            </div>
        </div>
    );
}
