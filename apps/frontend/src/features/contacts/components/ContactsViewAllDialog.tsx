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
            <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-[95vw] p-0 overflow-hidden border-none shadow-2xl rounded-lg">
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b bg-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                            <User className="h-4 w-4" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-700">
                            Contact ({contacts.length})
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 h-7 text-xs px-3 font-bold"
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
                            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-400"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="max-h-[75vh] overflow-y-auto overflow-x-hidden p-1">
                    <Table className="w-full">
                        <TableHeader className="bg-white sticky top-0 z-10 border-b">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[25%] px-3">Name</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[25%] px-3">Title</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[25%] px-3">Email</TableHead>
                                <TableHead className="text-[12px] font-bold text-slate-800 h-10 py-0 w-[25%] px-3">Phone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow key={contact.id} className="hover:bg-slate-50 border-slate-100">
                                    <TableCell className="py-2 px-3">
                                        <Link 
                                            href={`/contacts/${contact.id}`}
                                            className="text-[12px] font-bold text-blue-500 hover:underline block truncate"
                                            onClick={() => onOpenChange(false)}
                                        >
                                            {contact.first_name} {contact.last_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 truncate">
                                        {contact.title || "-"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 truncate">
                                        {contact.email || "-"}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-[12px] font-bold text-slate-600 whitespace-nowrap">
                                        {contact.phone || contact.mobile || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 border-t bg-white flex justify-end">
                    <Button 
                        variant="secondary" 
                        className="bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border-none px-6 font-bold h-9"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
