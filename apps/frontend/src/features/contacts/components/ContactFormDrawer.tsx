"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ContactForm } from "./ContactForm";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ContactFormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Optional data indicating edit mode */
    initialData?: any;
    /** Contact ID for edit mode */
    contactId?: string;
    /** Initial Account string for display logic */
    initialAccountName?: string;
}

export function ContactFormDrawer({
    open,
    onOpenChange,
    initialData,
    contactId,
    initialAccountName
}: ContactFormDrawerProps) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [editData, setEditData] = useState<any>(initialData);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!open || !contactId || editData) return;
        
        let cancelled = false;
        const fetchContact = async () => {
            setLoading(true);
            try {
                // If we didn't get initialData but have a contactId, we should ideally fetch it.
                // In the current uses, initialData is usually passed from the detail or list view.
            } catch (error) {
                console.error("Failed to load contact:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchContact();
        return () => { cancelled = true; };
    }, [open, contactId, editData]);

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        // Might also affect account details if they show related contacts
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        router.refresh();
        onOpenChange(false);
        setEditData(undefined);
    };

    const handleClose = () => {
        onOpenChange(false);
        setEditData(undefined);
    };

    const titleMode = contactId ? "Edit" : "Create";
    const title = `${titleMode} Contact${editData?.first_name ? ` — ${editData.first_name} ${editData.last_name || ""}` : ""}`;

    return (
        <FormDrawer
            open={open}
            onOpenChange={handleClose}
            title={title}
            subtitle={contactId ? "Update the details of this contact" : "Enter details for a new contact"}
        >
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-sm text-slate-500">Loading form...</span>
                </div>
            ) : (
                <div className="p-5 overflow-x-hidden">
                    <ContactForm
                        key={contactId || "new"}
                        initialData={editData || initialData}
                        id={contactId}
                        initialAccountName={initialAccountName}
                        onSuccess={handleSuccess}
                        onCancel={handleClose}
                        isDrawer
                    />
                </div>
            )}
        </FormDrawer>
    );
}
