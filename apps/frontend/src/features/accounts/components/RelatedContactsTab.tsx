import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Mail, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";

interface RelatedContactsTabProps {
    accountId: string;
    contacts: any[];
}

export function RelatedContactsTab({ accountId, contacts }: RelatedContactsTabProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Related Contacts</CardTitle>
                        <CardDescription>
                            Contacts associated with this account
                        </CardDescription>
                    </div>
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Link Contact
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {contacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No contacts linked to this account</p>
                        <Button variant="outline" size="sm" className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Link First Contact
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.map((contact) => (
                                <TableRow key={contact.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/contacts/${contact.id}`}
                                            className="hover:underline flex items-center gap-1"
                                        >
                                            {contact.first_name} {contact.last_name}
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </TableCell>
                                    <TableCell>{contact.title || "-"}</TableCell>
                                    <TableCell>
                                        {contact.email ? (
                                            <a
                                                href={`mailto:${contact.email}`}
                                                className="flex items-center gap-1 text-primary hover:underline"
                                            >
                                                <Mail className="h-3 w-3" />
                                                {contact.email}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {contact.phone ? (
                                            <a
                                                href={`tel:${contact.phone}`}
                                                className="flex items-center gap-1 text-primary hover:underline"
                                            >
                                                <Phone className="h-3 w-3" />
                                                {contact.phone}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            Unlink
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
