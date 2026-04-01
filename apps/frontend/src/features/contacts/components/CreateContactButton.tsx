"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactFormDrawer } from "./ContactFormDrawer";

export function CreateContactButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Contact
            </Button>
            <ContactFormDrawer
                open={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    );
}
