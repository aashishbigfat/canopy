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
import { isPersonAccountEmail } from "@/lib/utils";
import { Account } from "../types";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { RelatedOpportunitiesCards } from "@/components/shared/RelatedOpportunitiesCards";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountService } from "../services/accountService";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AccountDetailViewProps {
    account: Account & {
        owner_name?: string;
        related_contacts?: any[];
        related_opportunities?: any[];
        related_tasks?: any[];
        account_type_name?: string;
        industry_name?: string;
        rating_name?: string;
        parent_account_name?: string;
    };
}

export function AccountDetailView({ account }: AccountDetailViewProps) {
    const isB2C = isPersonAccountEmail(account.email);
    const headerType = isB2C ? "Person Account" : "Account";
    const badgeLabel = isB2C ? "B2C" : "B2B";
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
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
                onEdit={() => router.push(`/${isB2C ? 'person-accounts' : 'accounts'}/${account.id}/edit`)}
                onDelete={() => setIsDeleteOpen(true)}
                onChangeOwner={(newOwnerId) => changeOwnerMutation.mutate(newOwnerId)}
                isChangingOwner={changeOwnerMutation.isPending}
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
                            <TabsContent value="related" className="mt-0 space-y-8">
                                {/* Related Contacts - Hidden for B2C */}
                                {!isB2C && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-bold flex items-center gap-2">
                                                <div className="h-6 w-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                    <UserIcon className="h-3 w-3" />
                                                </div>
                                                Contacts ({account.related_contacts?.length || 0})
                                            </h2>
                                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold">
                                                <Plus className="h-3 w-3 mr-1" />
                                                New
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {account.related_contacts?.map((contact) => (
                                                <Link href={`/contacts/${contact.id}`} key={contact.id} className="block">
                                                    <Card className="hover:border-blue-300 transition-all shadow-sm h-full">
                                                        <CardContent className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                                    <UserIcon className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-blue-600">{contact.first_name} {contact.last_name}</p>
                                                                    <p className="text-xs text-slate-500">{contact.title || "No Title"}</p>
                                                                </div>
                                                            </div>
                                                            <ArrowUpRight className="h-4 w-4 text-slate-300" />
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Related Opportunities */}
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold flex items-center gap-2">
                                            <div className="h-6 w-6 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Briefcase className="h-3 w-3" />
                                            </div>
                                            Opportunities ({account.related_opportunities?.length || 0})
                                        </h2>
                                        <Button variant="outline" size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white border-none h-8 px-4 text-xs font-bold">
                                            <Link href={`/opportunities/create?accountId=${account.id}`}>
                                                <Plus className="h-3 w-3 mr-1" />
                                                New
                                            </Link>
                                        </Button>
                                    </div>
                                    <RelatedOpportunitiesCards
                                        opportunities={account.related_opportunities || []}
                                        accountId={account.id}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="details" className="mt-0">
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-blue-600" />
                                                Account Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                                                <p className="text-sm font-medium text-slate-700">{account.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p>
                                                <p className="text-sm font-medium text-blue-600 underline">{account.website || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                                <p className="text-sm font-medium text-blue-600 underline">{account.email || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                                <p className="text-sm font-medium text-slate-700">{account.phone || "-"}</p>
                                            </div>

                                            {!isB2C && (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</p>
                                                        <p className="text-sm font-medium text-slate-700">{account.industry_name || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Type</p>
                                                        <p className="text-sm font-medium text-slate-700">{account.account_type_name || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent Account</p>
                                                        <p className="text-sm font-medium text-blue-600 underline">{account.parent_account_name || "-"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</p>
                                                        <p className="text-sm font-medium text-slate-700">{account.rating_name || "-"}</p>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3 border-b bg-slate-50/50">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-red-500" />
                                                Address Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Street</p>
                                                <p className="text-sm font-medium text-slate-700">{account.billing_street || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing City</p>
                                                <p className="text-sm font-medium text-slate-700">{account.billing_city || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing State/Province</p>
                                                <p className="text-sm font-medium text-slate-700">{account.billing_state || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Zip/Postal Code</p>
                                                <p className="text-sm font-medium text-slate-700">{account.billing_zip || "-"}</p>
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Country</p>
                                                <p className="text-sm font-medium text-slate-700">{account.billing_country || "-"}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                                    <Paperclip className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                    <p className="text-slate-500">No attachments found.</p>
                                    <Button variant="outline" size="sm" className="mt-4">Upload File</Button>
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
        </div>
    );
}
