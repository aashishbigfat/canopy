import { AccountForm } from "@/features/accounts/components/AccountForm";

export default async function CreateAccountPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const isPersonAccount = searchParams.type === "person";

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Create {isPersonAccount ? "Person Account" : "Account"}</h3>
                <p className="text-sm text-muted-foreground">
                    Fill in the details to register a new {isPersonAccount ? "person account" : "account"}.
                </p>
            </div>
            <AccountForm isPersonAccount={isPersonAccount} />
        </div>
    );
}
