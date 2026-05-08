"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Plus,
    LayoutGrid,
    Loader2,
    RotateCw,
    Settings as SettingsIcon,
    Filter as FilterIcon,
    Kanban as KanbanIcon,
    FileDown,
    Lightbulb,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupedOpportunityTable } from "@/features/opportunities/components/GroupedOpportunityTable";
import { KanbanBoard } from "@/features/opportunities/components/KanbanBoard";
import { useOpportunities, useSalesStages } from "@/features/opportunities/api/useOpportunities";
import { Opportunity } from "@/features/opportunities/types";
import { cn } from "@/lib/utils";
import { normalizeSalesStages } from "@/features/opportunities/utils/stageConfig";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OpportunityFormDrawer } from "@/features/opportunities/components/OpportunityFormDrawer";
import { EntityListToolbar } from "@/features/views/EntityListToolbar";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useIndustryLabels } from "@/lib/industry-labels";

type ViewMode = "list" | "kanban";

export default function OpportunitiesPageClient() {
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [groupByOwner, setGroupByOwner] = useState(true);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const labels = useIndustryLabels();
    
    const page = parseInt(searchParams.get("page") || "1");
    const defaultView = searchParams.get("view") || searchParams.get("filter") || "today";

    const opportunityViews = [
        { label: `Today ${labels.opportunities}`, value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: `All ${labels.opportunities}`, value: "all" },
        { label: `Closed ${labels.opportunities}`, value: "closed" },
    ];
    const [currentView, setCurrentView] = useState(defaultView);
    const currentViewLabel = opportunityViews.find(v => v.value === currentView)?.label || opportunityViews.find(v => v.value === "today")?.label || `Today ${labels.opportunities}`;

    const { data: opportunitiesData, isLoading: isLoadingOpportunities } = useOpportunities({
        page: page,
        per_page: 100, // Get more for kanban view
        view: currentView
    });
    const { data: stages, isLoading: isLoadingStages } = useSalesStages();

    const opportunities = opportunitiesData?.opportunities || [];
    const normalizedStages = normalizeSalesStages(stages || []);

    const handleOpportunityClick = (opportunity: Opportunity) => {
        router.push(`/opportunities/${opportunity.id}`);
    };

    const isLoading = isLoadingOpportunities || isLoadingStages;


    return (
        <div className="crm-page">
            <EntityListToolbar entity="opportunity" />
            <div className="crm-surface space-y-4 rounded-b-none border-b-0 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary p-2 text-primary-foreground">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-primary">
                                {labels.opportunity} ({opportunities.length})
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-foreground transition-colors hover:text-primary">
                                        {currentViewLabel}
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    {opportunityViews.map((view) => (
                                        <DropdownMenuItem
                                            key={view.value}
                                            onClick={() => setCurrentView(view.value)}
                                        >
                                            {view.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            title={groupByOwner ? "Show all opportunities" : "Group by owner"}
                            className={cn(
                                "h-9 w-9 transition-colors",
                                groupByOwner
                                    ? "border-primary bg-primary text-white hover:bg-primary/90"
                                    : "border-border bg-muted/70 text-foreground hover:bg-accent"
                            )}
                            onClick={() => setGroupByOwner(prev => !prev)}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <PermissionGate permission="create_opportunity">
                            <Button 
                                className="h-9 gap-2 px-4 shadow-sm"
                                onClick={() => setIsCreateDrawerOpen(true)}
                            >
                                    <Plus className="h-4 w-4" />
                                    New {labels.opportunity}
                            </Button>
                        </PermissionGate>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-border bg-card text-foreground hover:bg-accent">
                            <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-border bg-card text-foreground hover:bg-accent">
                            <FilterIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="h-9 font-medium">
                            Settings
                        </Button>
                        <Button
                            variant={viewMode === "kanban" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-9 px-3 gap-1.5 font-medium",
                                viewMode === "kanban"
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                            onClick={() => setViewMode(viewMode === "kanban" ? "list" : "kanban")}
                        >
                            <KanbanIcon className="h-3.5 w-3.5" />
                            Kanban
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="crm-surface overflow-hidden rounded-t-none border-t-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : viewMode === "kanban" ? (
                    <KanbanBoard
                        opportunities={opportunities}
                        stages={normalizedStages}
                        onOpportunityClick={handleOpportunityClick}
                    />
                ) : (
                    <div className="w-full overflow-x-auto">
                        <GroupedOpportunityTable
                            data={opportunities}
                            onOpportunityClick={handleOpportunityClick}
                            groupByOwner={groupByOwner}
                        />
                        
                        <div className="flex flex-col gap-2 space-x-0 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-2 sm:px-6">
                            <div className="text-sm font-medium text-muted-foreground">
                                Showing {opportunities.length} of {opportunitiesData?.total || 0} records
                            </div>
                            <div className="space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 font-medium"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("page", (page - 1).toString());
                                        router.push(`${window.location.pathname}?${params.toString()}`);
                                    }}
                                    disabled={page <= 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 font-medium"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("page", (page + 1).toString());
                                        router.push(`${window.location.pathname}?${params.toString()}`);
                                    }}
                                    disabled={!opportunitiesData || page >= opportunitiesData.pages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <OpportunityFormDrawer
                open={isCreateDrawerOpen}
                onOpenChange={setIsCreateDrawerOpen}
                stages={normalizedStages}
            />
        </div>
    );
}
