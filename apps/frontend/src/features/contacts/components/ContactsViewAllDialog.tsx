"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, X, Plus } from "lucide-react";
import Link from "next/link";

interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
    email?: string;
    phone?: string;
    mobile?: string;
}

interface ContactsViewAllDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    accountId?: string;
    onNew?: () => void;
}

export function ContactsViewAllDialog({
    open,
    onOpenChange,
    contacts,
    accountId,
    onNew
}: ContactsViewAllDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] overflow-hidden rounded-lg border-border bg-card p-0 shadow-2xl sm:max-w-[95vw]">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <User className="h-4 w-4" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Contact ({contacts.length})
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 crm-icon-primary px-3 text-xs font-bold hover:bg-primary/25"
                            onClick={() => {
                                onOpenChange(false);
                                onNew?.();
                            }}
                        >
                            New
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="max-h-[75vh] overflow-x-hidden overflow-y-auto p-1">
                    <Table className="w-full">
                        <TableHeader className="sticky top-0 z-10 bg-muted/40 border-b border-border">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="h-10 w-[25%] px-3 py-0 text-[12px] font-bold text-foreground">Name</TableHead>
                                <TableHead className="h-10 w-[25%] px-3 py-0 text-[12px] font-bold text-foreground">Title</TableHead>
                                <TableHead className="h-10 w-[25%] px-3 py-0 text-[12px] font-bold text-foreground">Email</TableHead>
                                <TableHead className="h-10 w-[25%] px-3 py-0 text-[12px] font-bold text-foreground">Phone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow key={contact.id} className="border-border hover:bg-muted/40">
                                    <TableCell className="py-2 px-3">
                                        <Link 
                                            href={`/contacts/${contact.id}`}
                                            className="text-[12px] font-bold text-blue-500 hover:underline block truncate"
                                            onClick={() => onOpenChange(false)}
                                        >
                                            {contact.first_name} {contact.last_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 truncate">
                                        {contact.title || "-"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 truncate">
                                        {contact.email || "-"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-foreground/90 whitespace-nowrap">
                                        {contact.phone || contact.mobile || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end crm-dialog-footer">
                    <Button
                        variant="secondary"
                        className="h-9 border-none crm-icon-primary px-6 font-bold hover:bg-primary/25"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
