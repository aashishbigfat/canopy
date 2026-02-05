"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserCog, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AccountOverviewTab } from "./AccountOverviewTab";
import { RelatedContactsTab } from "./RelatedContactsTab";
import { RelatedOpportunitiesTab } from "./RelatedOpportunitiesTab";
import { RelatedTasksTab } from "./RelatedTasksTab";

interface AccountDetailViewProps {
    account: any; // TODO: Add proper type
}

export function AccountDetailView({ account }: AccountDetailViewProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/accounts">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{account.name}</h1>
                            <p className="text-muted-foreground">
                                {account.account_type_name || "Account"} • Owner: {account.owner_name}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <UserCog className="mr-2 h-4 w-4" />
                        Change Owner
                    </Button>
                    <Link href={`/accounts/${account.id}/edit`}>
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </Link>
                    <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Contacts</CardDescription>
                        <CardTitle className="text-2xl">
                            {account.related_contacts?.length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Opportunities</CardDescription>
                        <CardTitle className="text-2xl">
                            {account.related_opportunities?.length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Tasks</CardDescription>
                        <CardTitle className="text-2xl">
                            {account.related_tasks?.length || 0}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Views</CardDescription>
                        <CardTitle className="text-2xl">{account.view_count || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="contacts">
                        Contacts ({account.related_contacts?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="opportunities">
                        Opportunities ({account.related_opportunities?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                        Tasks ({account.related_tasks?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <AccountOverviewTab account={account} />
                </TabsContent>

                <TabsContent value="contacts">
                    <RelatedContactsTab
                        accountId={account.id}
                        contacts={account.related_contacts || []}
                    />
                </TabsContent>

                <TabsContent value="opportunities">
                    <RelatedOpportunitiesTab
                        accountId={account.id}
                        opportunities={account.related_opportunities || []}
                    />
                </TabsContent>

                <TabsContent value="tasks">
                    <RelatedTasksTab
                        accountId={account.id}
                        tasks={account.related_tasks || []}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
