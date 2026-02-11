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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Contact } from "../types";
import { EntityDetailHeader } from "@/components/shared/EntityDetailHeader";
import { EntityActivitySidebar } from "@/components/shared/EntityActivitySidebar";
import { RelatedOpportunitiesCards } from "@/components/shared/RelatedOpportunitiesCards";

interface ContactDetailsProps {
    contact: Contact & {
        owner_name?: string;
        related_opportunities?: any[];
        related_tasks?: any[];
    };
}

export function ContactDetails({ contact }: ContactDetailsProps) {
    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* High Fidelity Header */}
            <EntityDetailHeader
                type="Contact"
                name={contact.full_name}
                id={contact.id}
                phone={contact.phone}
                email={contact.email}
                ownerName={contact.owner_name}
                onEdit={() => console.log("Edit contact")}
                onDelete={() => console.log("Delete contact")}
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
                                    <Button variant="outline" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none h-8 px-4 text-xs font-bold">
                                        <Plus className="h-3 w-3 mr-1" />
                                        New
                                    </Button>
                                </div>
                                <RelatedOpportunitiesCards opportunities={contact.related_opportunities || []} />
                            </TabsContent>

                            <TabsContent value="details" className="mt-0">
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="pb-3 border-b bg-slate-50/50">
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
                                                <p className="text-sm font-medium text-blue-600 underline">{contact.email || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.phone || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</p>
                                                <p className="text-sm font-medium text-slate-700">{contact.title || "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                                                <p className="text-sm font-medium text-blue-600 underline">{contact.account_name || "-"}</p>
                                            </div>
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
                        entityType="Contact"
                        entityId={contact.id}
                        entityName={contact.full_name}
                        relatedTo={contact.account_name}
                    />
                </div>
            </div>
        </div>
    );
}
