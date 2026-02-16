import { ContactForm } from "@/features/contacts/components/ContactForm";
import { contactService } from "@/features/contacts/services/contactService";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

interface EditContactPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditContactPage(props: EditContactPageProps) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return null;
    }

    const contact = await contactService.getContact(params.id);

    if (!contact) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Edit Contact</h1>
                <p className="text-muted-foreground">Update the details for {contact.first_name} {contact.last_name}</p>
            </div>
            <div className="bg-white rounded-lg border p-6">
                <ContactForm
                    id={params.id}
                    initialData={{
                        first_name: contact.first_name || "",
                        last_name: contact.last_name || "",
                        email: contact.email || "",
                        phone: contact.phone || "",
                        title: contact.title || "",
                        account_id: contact.account_id || "",
                    }}
                />
            </div>
        </div>
    );
}
