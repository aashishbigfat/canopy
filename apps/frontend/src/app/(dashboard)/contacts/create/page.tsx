import { ContactForm } from "@/features/contacts/components/ContactForm";

export default function CreateContactPage() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-lg font-medium">Create Contact</h3>
                <p className="text-sm text-muted-foreground">
                    Add a new contact to your CRM.
                </p>
            </div>
            <ContactForm />
        </div>
    );
}
