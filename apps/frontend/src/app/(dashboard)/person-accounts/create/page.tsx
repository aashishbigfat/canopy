import { AccountForm } from "@/features/accounts/components/AccountForm";

export default function CreatePersonAccountPage() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Create Person Account</h3>
                <p className="text-sm text-muted-foreground">
                    Fill in the details to register a new individual account.
                </p>
            </div>
            {/* The AccountForm will need to be updated to handle the person account flag */}
            <AccountForm isPersonAccount={true} />
        </div>
    );
}
