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

    let contact = null;
    try {
        contact = await contactService.getContact(params.id, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        });
    } catch (error) {
        console.error("Error fetching contact:", error);
        notFound();
    }

    if (!contact) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Edit Contact</h1>
                <p className="text-muted-foreground">Update the details for {contact.first_name} {contact.last_name}</p>
            </div>
            <div className="bg-white rounded-lg border p-6">
                <ContactForm
                    id={params.id}
                    initialData={contact}
                />
            </div>
        </div>
    );
}
