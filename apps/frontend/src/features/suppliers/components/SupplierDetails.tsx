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

interface SupplierDetailsProps {
    supplier: Supplier;
    users: { id: string; name: string }[];
}

export function SupplierDetails({
    supplier,
    users
}: SupplierDetailsProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
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
                            className="bg-red-500 hover:bg-red-600 text-white"
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
                onEdit={() => setIsEditDrawerOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                badge={supplier.supplier_type}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-11 p-0 gap-8">
                            <TabsTrigger
                                value="details"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Details
                            </TabsTrigger>
                            <TabsTrigger
                                value="contacts"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Contacts
                            </TabsTrigger>
                            <TabsTrigger
                                value="rfq"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                RFQ
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 h-11 text-xs font-bold uppercase tracking-wider text-slate-500 data-[state=active]:text-blue-600"
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>

                        <div className="py-6">
                            <TabsContent value="details" className="mt-0 space-y-6">
                                {/* Supplier Information Section Header (Alert style) */}
                                <div className="bg-sky-50 border border-sky-100 p-4 rounded-md flex items-center gap-3 mb-6">
                                    <div className="h-8 w-8 bg-orange-500 rounded-md flex items-center justify-center text-white">
                                        <Info size={18} />
                                    </div>
                                    <h3 className="font-bold text-orange-600">Supplier Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 px-4 pb-8 border-b">
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
                                        className="border-slate-100"
                                    >
                                        <div className="text-sm text-slate-600">
                                            {supplier.notes || "No summary available."}
                                        </div>
                                    </CollapsibleDetailSection>

                                    <CollapsibleDetailSection
                                        title="Address information"
                                        icon={<MapPin className="h-0 w-0" />}
                                        defaultOpen={false}
                                        className="border-slate-100"
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Billing Address</p>
                                                <p className="text-sm text-slate-700">
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
                                        className="border-slate-100"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 font-medium">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Created By</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-blue-600 font-medium">{owner?.name || "System"}</span>
                                                    <span className="text-slate-400 text-xs">, {formatDateTime(supplier.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Last Modified By</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-blue-600 font-medium">{owner?.name || "System"}</span>
                                                    <span className="text-slate-400 text-xs">, {formatDateTime(supplier.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CollapsibleDetailSection>
                                </div>
                            </TabsContent>

                            <TabsContent value="contacts" className="mt-0">
                                <SupplierContactsTab supplierId={supplier.id} />
                            </TabsContent>

                            <TabsContent value="rfq" className="mt-0">
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                                    <p className="text-slate-500 text-sm italic">RFQ management coming soon.</p>
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
        <div className="space-y-1.5 border-b border-slate-50 pb-2">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className={cn(
                "text-sm font-medium",
                isLink ? "text-blue-600 cursor-pointer hover:underline" : "text-slate-700"
            )}>
                {value || "-"}
            </p>
        </div>
    );
}
