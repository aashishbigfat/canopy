"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountFormDrawer } from "./AccountFormDrawer";

interface CreateAccountButtonProps {
    isPerson?: boolean;
}

export function CreateAccountButton({ isPerson = false }: CreateAccountButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {isPerson ? "Create Person Account" : "Create Account"}
            </Button>
            <AccountFormDrawer
                open={isOpen}
                onOpenChange={setIsOpen}
                isPersonAccount={isPerson}
            />
        </>
    );
}
