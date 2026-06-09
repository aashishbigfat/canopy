"use client";

import { useState } from "react";
import {
    Mail,
    Phone,
    Globe,
    MapPin,
    Building2,
    Calendar,
    User as UserIcon,
    Edit,
    Trash2,
    Paperclip,
    Info,
    ChevronDown,
    Map
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CollapsibleDetailSection } from "@/components/shared/CollapsibleDetailSection";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { Supplier } from "../types";
import { SupplierFormDrawer } from "./SupplierFormDrawer";
import { SupplierContactsTab } from "./SupplierContactsTab";

import { suppliersService } from "@/lib/api/services/suppliers.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { FileUploader } from "@/features/files/components/file-uploader";
import { FileList } from "@/features/files/components/file-list";

interface SupplierDetailsProps {
    supplier: Supplier;
    users: { id: string; name: string }[];
}

export function SupplierDetails({
    supplier,
    users
}: SupplierDetailsProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

    const changeOwnerMutation = useMutation({
        mutationFn: (newOwnerId: string) => suppliersService.changeOwner(supplier.id, newOwnerId),
        onSuccess: () => {
            toast.success("Owner changed successfully");
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            router.refresh();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || "Failed to change owner");
        },
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await suppliersService.deleteSupplier(supplier.id);
            toast.success("Supplier deleted successfully");
            router.push("/suppliers");
        } catch (error) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Failed to delete supplier");
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    const owner = users.find(u => u.id === supplier.owner_id);

    return (
        <div className="container mx-auto max-w-7xl px-4 py-6">
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{supplier.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-white"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* High Fidelity Header */}
            <EntityDetailHeader
                type="Supplier"
                name={supplier.name}
                id={supplier.id}
                phone={supplier.phone || supplier.mobile}
                email={supplier.email}
                ownerName={owner?.name}
                ownerId={supplier.owner_id}
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                badge={supplier.supplier_type}
                onChangeOwner={(newOwnerId) => changeOwnerMutation.mutate(newOwnerId)}
                isChangingOwner={changeOwnerMutation.isPending}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="h-11 w-full justify-start gap-8 rounded-none border-b bg-transparent p-0">
                            <TabsTrigger
                                value="details"
                                className="h-11 rounded-none px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                            >
                                Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="contacts"
                                className="h-11 rounded-none px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                            >
                                Contacts
                            </TabsTrigger>
                            <TabsTrigger
                                value="rfq"
                                className="h-11 rounded-none px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                            >
                                RFQ
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className="h-11 rounded-none px-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-6">
                            <TabsContent value="details" className="mt-0 space-y-6">
                                {/* Supplier Information Section Header (Alert style) */}
                                <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md crm-icon-primary">
                                        <Info size={18} />
                                    </div>
                                    <h3 className="font-semibold text-foreground">Supplier Information</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-x-12 gap-y-6 border-b px-4 pb-8 md:grid-cols-2">
                                    <DetailField label="Supplier name" value={supplier.name} />
                                    <DetailField label="Supplier Owner" value={owner?.name} isLink />
                                    <DetailField label="Supplier Type" value={supplier.supplier_type} />
                                    <DetailField label="Service(s)" value={supplier.services?.join(", ")} />
                                    <DetailField label="Phone" value={supplier.phone} />
                                    <DetailField label="Mobile" value={supplier.mobile} />
                                    <DetailField label="Email ID" value={supplier.email} />
                                    <DetailField label="Rating" value={supplier.rating?.toString()} />
                                    <DetailField label="Destinations" value={supplier.destinations?.join(", ")} isLink />
                                    <DetailField label="Countries" value={supplier.countries?.join(", ")} />
                                    <DetailField label="Rate List" value="-" />
                                </div>

                                {/* Collapsible Sections */}
                                <div className="space-y-4 pt-4">
                                    <CollapsibleDetailSection
                                        title="Supplier Summary"
                                        icon={<ChevronDown className="h-0 w-0" />} // Hiding default icon to match >> style
                                        className="border-border"
                                    >
                                        <div className="text-sm text-muted-foreground">
                                            {supplier.notes || "No summary available."}
                                        </div>
                                    </CollapsibleDetailSection>

                                    <CollapsibleDetailSection
                                        title="Address information"
                                        icon={<MapPin className="h-0 w-0" />}
                                        defaultOpen={false}
                                        className="border-border"
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Billing Address</p>
                                                <p className="text-sm text-foreground">
                                                    {[supplier.street, supplier.city, supplier.state, supplier.zip, supplier.country]
                                                        .filter(Boolean)
                                                        .join(", ") || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>

                                    <CollapsibleDetailSection
                                        title="System information"
                                        icon={<UserIcon className="h-0 w-0" />}
                                        defaultOpen={false}
                                        className="border-border"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 font-medium">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Created By</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-primary">{owner?.name || "System"}</span>
                                                    <span className="text-xs text-muted-foreground">, {formatDateTime(supplier.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Last Modified By</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-primary">{owner?.name || "System"}</span>
                                                    <span className="text-xs text-muted-foreground">, {formatDateTime(supplier.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>
                                </div>
                            </TabsContent>

                            <TabsContent value="contacts" className="mt-0">
                                <SupplierContactsTab supplier={supplier} />
                            </TabsContent>

                            <TabsContent value="rfq" className="mt-0">
                                <div className="crm-empty-state">
                                    <p className="text-sm italic text-muted-foreground">RFQ management coming soon.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-0">
                                <div className="py-4 space-y-6">
                                    <FileUploader
                                        entityType="Supplier"
                                        entityId={supplier.id}
                                    />
                                    <FileList
                                        entityType="Supplier"
                                        entityId={supplier.id}
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="w-full lg:w-[380px] flex-shrink-0">
                    <EntityActivitySidebar
                        entityType="Supplier"
                        entityId={supplier.id}
                        entityName={supplier.name}
                    />
                </div>
            </div>

            <SupplierFormDrawer
                open={isEditDrawerOpen}
                onOpenChange={(open) => {
                    setIsEditDrawerOpen(open);
                    if (!open) router.refresh();
                }}
                initialData={supplier}
                onSuccess={() => {
                    setIsEditDrawerOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}

function DetailField({ label, value, isLink }: { label: string; value?: string; isLink?: boolean }) {
    return (
        <div className="space-y-1.5 border-b border-border pb-2">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className={cn(
                "text-sm font-medium",
                isLink ? "cursor-pointer text-primary hover:underline" : "text-foreground"
            )}>
                {value || "-"}
            </p>
        </div>
    );
}
