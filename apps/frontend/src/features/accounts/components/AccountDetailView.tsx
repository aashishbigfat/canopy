"use client";

import {
    Mail,
    Phone as PhoneIcon,
    Globe,
    MapPin,
    Building2,
    Calendar,
    Briefcase,
    Plus,
    Paperclip,
    User as UserIcon,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Account } from "../types";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { RelatedOpportunitiesCards } from "@/components/shared/RelatedOpportunitiesCards";
import { CollapsibleDetailSection } from "@/components/shared/CollapsibleDetailSection";
import { AccountFormDrawer } from "./AccountFormDrawer";
import { OpportunitiesViewAllDialog } from "@/features/opportunities/components/OpportunitiesViewAllDialog";
import { ContactsViewAllDialog } from "@/features/contacts/components/ContactsViewAllDialog";
import { OpportunityFormDrawer } from "@/features/opportunities/components/OpportunityFormDrawer";
import { ContactFormDrawer } from "@/features/contacts/components/ContactFormDrawer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountService } from "../services/accountService";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { getSegmentBadgeClass, getSegmentLabel, SEGMENTS } from "@/lib/segments";

interface AccountDetailViewProps {
    account: Account & {
        owner_name?: string;
        related_contacts?: any[];
        related_opportunities?: any[];
        related_tasks?: any[];
        account_type_name?: string;
        industry_name?: string;
        parent_account_name?: string;
    };
}

export function AccountDetailView({ account }: AccountDetailViewProps) {
    const isB2C = account.is_person_account;
    const headerType = isB2C ? "Person Account" : "Account";
    // Use the stored segment field; fall back to is_person_account derivation for legacy records
    const badgeLabel = account.segment || (isB2C ? SEGMENTS.B2C : SEGMENTS.B2B);
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [isViewAllOpen, setIsViewAllOpen] = useState(false);
    const [isContactsViewAllOpen, setIsContactsViewAllOpen] = useState(false);
    const [isNewOppDrawerOpen, setIsNewOppDrawerOpen] = useState(false);
    const [isNewContactDrawerOpen, setIsNewContactDrawerOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await accountService.deleteAccount(account.id);
            toast.success("Account deleted successfully");
            router.push(isB2C ? "/person-accounts" : "/accounts");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to delete account");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    const changeOwnerMutation = useMutation({
        mutationFn: (newOwnerId: string) => accountService.changeOwner(account.id, newOwnerId),
        onSuccess: () => {
            toast.success("Owner changed successfully");
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            router.refresh();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || "Failed to change owner");
        }
    });

    return (
        <div className="container mx-auto max-w-7xl px-4 py-6 [&_.bg-white]:!bg-card [&_.border-slate-100]:!border-border [&_.border-slate-200]:!border-border [&_.border-slate-300]:!border-border [&_.text-slate-800]:!text-foreground [&_.text-slate-700]:!text-foreground [&_.text-slate-600]:!text-foreground/90 [&_.text-slate-500]:!text-muted-foreground [&_.text-slate-400]:!text-muted-foreground [&_.text-slate-300]:!text-muted-foreground">
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {headerType}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.
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
                type={headerType}
                badge={badgeLabel}
                name={account.name}
                id={account.id}
                phone={account.phone}
                email={account.email}
                ownerName={account.owner_name}
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                onChangeOwner={(newOwnerId) => changeOwnerMutation.mutate(newOwnerId)}
                isChangingOwner={changeOwnerMutation.isPending}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="related" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-11 p-0 gap-8 max-w-full overflow-x-auto flex-nowrap scrollbar-hide">
                            <TabsTrigger
                                value="related"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-blue-600"
                            >
                                Related
                            </TabsTrigger>
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-blue-600"
                            >
                                Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-blue-600"
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-6">
                            <TabsContent value="related" className="mt-0 space-y-8">
                                {/* Related Contacts - Hidden for B2C */}
                                {!isB2C && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h2 className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-white">
                                                    <UserIcon className="h-3 w-3" />
                                                </div>
                                                Contact ({account.related_contacts?.length || 0})
                                                <span 
                                                    className="text-blue-500 text-xs hover:underline cursor-pointer ml-1"
                                                    onClick={() => setIsContactsViewAllOpen(true)}
                                                >
                                                    View All
                                                </span>
                                            </h2>
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={() => setIsNewContactDrawerOpen(true)}
                                                className="h-7 text-xs bg-blue-500 hover:bg-blue-600"
                                            >
                                                New
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                            {account.related_contacts?.map((contact) => (
                                                <Link href={`/contacts/${contact.id}`} key={contact.id} className="block">
                                                    <Card className="h-full rounded-lg border-border bg-card transition-all hover:border-blue-400/60 hover:shadow-md">
                                                        <CardContent className="p-3">
                                                            <div className="flex items-start gap-2.5">
                                                                <div className="space-y-1 w-full">
                                                                    <p className="truncate text-[13px] font-bold leading-tight text-blue-500 hover:underline">
                                                                        {contact.first_name} {contact.last_name}
                                                                    </p>
                                                                    
                                                                    <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                                                                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-muted">
                                                                            <UserIcon className="h-2.5 w-2.5 text-muted-foreground" />
                                                                        </div>
                                                                        <span className="truncate text-[11px] font-semibold text-muted-foreground">{contact.title || "No Title"}</span>
                                                                    </div>
                                                                    
                                                                    <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                                                                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-muted">
                                                                            <svg xmlns="http://www.w3.org/2000/xyz" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail h-2.5 w-2.5 text-muted-foreground"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                                                        </div>
                                                                        <span className="truncate text-[11px] font-semibold text-muted-foreground">{contact.email || "No Email"}</span>
                                                                    </div>
                                                                    
                                                                    <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                                                                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-muted">
                                                                            <svg xmlns="http://www.w3.org/2000/xyz" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone h-2.5 w-2.5 text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                                        </div>
                                                                        <span className="truncate text-[11px] font-semibold text-muted-foreground">{contact.phone || contact.mobile || "-"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Related Opportunities */}
                                <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h2 className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center text-white pb-[1px]">
                                                    <Briefcase className="h-[10px] w-[10px]" />
                                                </div>
                                                Opportunities({account.related_opportunities?.length || 0})
                                                <span 
                                                    className="text-blue-500 text-xs hover:underline cursor-pointer ml-1"
                                                    onClick={() => setIsViewAllOpen(true)}
                                                >
                                                    View All
                                                </span>
                                            </h2>
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={() => setIsNewOppDrawerOpen(true)}
                                                className="h-7 text-xs bg-blue-500 hover:bg-blue-600"
                                            >
                                                New
                                            </Button>
                                        </div>
                                    <RelatedOpportunitiesCards
                                        opportunities={account.related_opportunities || []}
                                        accountId={account.id}
                                        onNewClick={() => setIsNewOppDrawerOpen(true)}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="details" className="mt-0">
                                <div className="space-y-6">
                                    <Card className="border-border bg-card">
                                        <CardHeader className="border-b border-border bg-muted/40 pb-3">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-blue-600" />
                                                Account Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                                                <p className="text-sm font-medium text-slate-200">{account.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p>
                                                <p className="text-sm font-medium text-blue-400 underline">{account.website || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                                <p className="text-sm font-medium text-blue-400 underline">{account.email || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                                <p className="text-sm font-medium text-slate-200">{account.phone || "-"}</p>
                                            </div>

                                            {!isB2C && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</p>
                                                        <p className="text-sm font-medium text-slate-200">{account.industry_name || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Type</p>
                                                        <p className="text-sm font-medium text-slate-200">{account.account_type_name || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent Account</p>
                                                        <p className="text-sm font-medium text-blue-400 underline">{account.parent_account_name || "-"}</p>
                                                    </div>
                                                </>
                                            )}
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
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Street</p>
                                                <p className="text-sm font-medium text-slate-200">{account.billing_street || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing City</p>
                                                <p className="text-sm font-medium text-slate-200">{account.billing_city || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing State/Province</p>
                                                <p className="text-sm font-medium text-slate-200">{account.billing_state || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Zip/Postal Code</p>
                                                <p className="text-sm font-medium text-slate-200">{account.billing_zip || "-"}</p>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Country</p>
                                                <p className="text-sm font-medium text-slate-200">{account.billing_country || "-"}</p>
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
                                                    <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{account.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-xs">at {formatDateTime(account.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Modified By</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-blue-400 cursor-pointer hover:underline">{account.last_modified_by_name || account.created_by_name || "Unknown"}</p>
                                                    <span className="text-slate-400 text-xs">at {formatDateTime(account.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="crm-empty-state">
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
                        entityType="Account"
                        entityId={account.id}
                        entityName={account.name}
                        relatedTo={account.parent_account_name}
                    />
                </div>
            </div>

            {/* Opportunities View All Modal */}
            <OpportunitiesViewAllDialog
                open={isViewAllOpen}
                onOpenChange={setIsViewAllOpen}
                opportunities={account.related_opportunities || []}
                accountId={account.id}
                onNew={() => setIsNewOppDrawerOpen(true)}
            />

            {/* Contacts View All Modal */}
            <ContactsViewAllDialog
                open={isContactsViewAllOpen}
                onOpenChange={setIsContactsViewAllOpen}
                contacts={account.related_contacts || []}
                accountId={account.id}
                onNew={() => setIsNewContactDrawerOpen(true)}
            />

            {/* New Record Drawers */}
            <OpportunityFormDrawer 
                open={isNewOppDrawerOpen}
                onOpenChange={setIsNewOppDrawerOpen}
                initialAccountId={account.id}
            />

            <ContactFormDrawer 
                open={isNewContactDrawerOpen}
                onOpenChange={setIsNewContactDrawerOpen}
                initialData={{ account_id: account.id }}
                initialAccountName={account.name}
            />

            <AccountFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={(open) => {
                    setIsEditDrawerOpen(open);
                    if (!open) router.refresh();
                }}
                isPersonAccount={isB2C}
                accountId={account.id}
                initialData={account}
            />
        </div>
    );
}
