import { AccountForm } from "@/features/accounts/components/AccountForm";

export default function CreateAccountPage() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Create Account</h3>
                <p className="text-sm text-muted-foreground">
                    Fill in the details to register a new account.
                </p>
            </div>
            <AccountForm />
        </div>
    );
}
