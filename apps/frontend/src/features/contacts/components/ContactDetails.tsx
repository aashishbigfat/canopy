"use client";

import {
    Mail,
    Phone as PhoneIcon,
    Globe,
    MapPin,
    Building2,
    User as UserIcon,
    Briefcase,
    FileText,
    Paperclip,
    Plus
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Contact } from "../types";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { RelatedOpportunitiesCards } from "@/components/shared/RelatedOpportunitiesCards";
import { CollapsibleDetailSection } from "@/components/shared/CollapsibleDetailSection";
import { contactsService } from "@/lib/api/services/contacts.service";
import { ContactFormDrawer } from "./ContactFormDrawer";
import { OpportunityFormDrawer } from "@/features/opportunities/components/OpportunityFormDrawer";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

interface ContactDetailsProps {
    contact: Contact & {
        owner_name?: string;
        related_opportunities?: any[];
        related_tasks?: any[];
    };
}

export function ContactDetails({ contact }: ContactDetailsProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isNewOppDrawerOpen, setIsNewOppDrawerOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await contactsService.deleteContact(contact.id);
            toast.success("Contact deleted successfully");
            router.push("/contacts");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to delete contact");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl px-4 py-6 [&_.bg-white]:!bg-card [&_.border-slate-100]:!border-border [&_.border-slate-200]:!border-border [&_.border-slate-300]:!border-border [&_.text-slate-800]:!text-foreground [&_.text-slate-700]:!text-foreground [&_.text-slate-600]:!text-foreground/90 [&_.text-slate-500]:!text-muted-foreground [&_.text-slate-400]:!text-muted-foreground [&_.text-slate-300]:!text-muted-foreground">
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{contact.full_name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* High Fidelity Header */}
            <EntityDetailHeader
                type="Contact"
                name={contact.full_name}
                id={contact.id}
                phone={contact.phone}
                email={contact.email}
                ownerName={contact.owner_name}
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="related" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-11 p-0 gap-8">
                            <TabsTrigger
                                value="related"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Related
                            </TabsTrigger>
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-6">
                            <TabsContent value="related" className="mt-0 space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-bold flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                                            <Briefcase className="h-3 w-3" />
                                        </div>
                                        Opportunities ({contact.related_opportunities?.length || 0})
                                    </h2>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setIsNewOppDrawerOpen(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white border-none h-8 px-4 text-xs font-bold"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        New
                                    </Button>
                                </div>
                                <RelatedOpportunitiesCards
                                    opportunities={contact.related_opportunities || []}
                                    contactId={contact.id}
                                    onNewClick={() => setIsNewOppDrawerOpen(true)}
                                />
                            </TabsContent>

                            <TabsContent value="details" className="mt-0">
                                <div className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardHeader className="border-b border-border bg-muted/40 pb-3">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-blue-600" />
                                                Contact Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salutation</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.salutation || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.full_name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                                {contact.email ? (
                                                    <a href={`mailto:${contact.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                        {contact.email}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm font-medium text-slate-700">-</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                                {contact.phone ? (
                                                    <a href={`tel:${contact.phone}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                        {contact.phone}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm font-medium text-slate-700">-</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.title || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                                                {contact.account_name && contact.account_id ? (
                                                    <Link href={`/accounts/${contact.account_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                                                        {contact.account_name}
                                                    </Link>
                                                ) : (
                                                    <p className="text-sm font-medium text-slate-700">-</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <CollapsibleDetailSection
                                        title="Address Information"
                                        icon={<MapPin className="h-4 w-4" />}
                                        defaultOpen={false}
                                        className="border-border"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing Street</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.mailing_street || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing City</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.mailing_city || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing State/Province</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.mailing_state || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing Zip/Postal Code</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.mailing_zip || "-"}</p>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mailing Country</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.mailing_country || "-"}</p>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>

                                    <CollapsibleDetailSection
                                        title="System Information"
                                        icon={<UserIcon className="h-4 w-4" />}
                                        defaultOpen={false}
                                        className="border-border"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created By</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">{contact.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-xs">at {formatDateTime(contact.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Modified By</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">{contact.last_modified_by_name || contact.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-xs">at {formatDateTime(contact.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 py-12 text-center">
                                    <Paperclip className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                                    <p className="text-muted-foreground">No attachments found.</p>
                                    <Button variant="outline" size="sm" className="mt-4 border-border">Upload File</Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="w-full lg:w-[380px] flex-shrink-0">
                    <EntityActivitySidebar
                        entityType="Contact"
                        entityId={contact.id}
                        entityName={contact.full_name}
                        relatedTo={contact.account_name}
                    />
                </div>
            </div>

            <ContactFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={(open: boolean) => {
                    setIsEditDrawerOpen(open);
                    if (!open) router.refresh();
                }}
                contactId={contact.id}
                initialData={contact}
            />

            <OpportunityFormDrawer 
                open={isNewOppDrawerOpen}
                onOpenChange={setIsNewOppDrawerOpen}
                initialContactId={contact.id}
                initialAccountId={contact.account_id}
            />
        </div>
    );
}
