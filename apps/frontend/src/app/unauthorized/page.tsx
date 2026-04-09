"use client";

import { ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
            <div className="max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                    <ShieldAlert className="h-8 w-8 text-amber-700" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    You are not authorized to access this page, contact to administrator.
                </p>
                <Button
                    type="button"
                    className="mt-6"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    Sign out
                </Button>
            </div>
        </div>
    );
}
