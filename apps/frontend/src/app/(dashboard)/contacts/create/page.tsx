"use client";

import { ContactForm } from "@/features/contacts/components/ContactForm";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CreateContactContent() {
    const searchParams = useSearchParams();
    const accountId = searchParams.get("accountId") || undefined;

    return (
        <div className="container mx-auto py-8 text-[90%]">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">New Contact</h1>
                <p className="text-muted-foreground text-sm font-bold">Fill in the details to create a new contact.</p>
            </div>
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden p-6">
                <ContactForm 
                    initialData={accountId ? { account_id: accountId } as any : undefined}
                />
            </div>
        </div>
    );
}

export default function CreateContactPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateContactContent />
        </Suspense>
    );
}
