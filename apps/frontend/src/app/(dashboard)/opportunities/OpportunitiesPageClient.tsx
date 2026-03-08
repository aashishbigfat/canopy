"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";

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

type ViewMode = "list" | "kanban";

export default function OpportunitiesPageClient() {
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [groupByOwner, setGroupByOwner] = useState(true);
    const router = useRouter();

    const opportunityViews = [
        { label: "Today Opportunities", value: "today" },
        { label: "Recently Viewed", value: "recent" },
        { label: "All Opportunities", value: "all" },
        { label: "Closed Opportunities", value: "closed" },
    ];
    const [currentView, setCurrentView] = useState("today");
    const currentViewLabel = opportunityViews.find(v => v.value === currentView)?.label || "Today Opportunities";

    const { data: opportunitiesData, isLoading: isLoadingOpportunities } = useOpportunities({
        page: 1,
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
        <div className="space-y-6">
            {/* Header & Toolbar */}
            <div className="bg-slate-50/50 p-4 rounded-t-lg border border-b-0 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-600 rounded-full text-white">
                            <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] text-blue-600 font-semibold uppercase">
                                Opportunity ({opportunities.length})
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-2 text-lg font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors">
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

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            title={groupByOwner ? "Show all opportunities" : "Group by owner"}
                            className={cn(
                                "h-9 w-9 border-slate-200 transition-colors",
                                groupByOwner
                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={() => setGroupByOwner(prev => !prev)}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 px-4 shadow-sm">
                            <Link href="/opportunities/create">
                                <Plus className="h-4 w-4" />
                                New Opportunity
                            </Link>
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                            <RotateCw className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                            <FilterIcon className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="outline" className="h-9 bg-violet-600 hover:bg-violet-700 text-white border-none shadow-sm font-medium">
                            Settings
                        </Button>
                        <Button
                            variant={viewMode === "kanban" ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-9 px-3 gap-1.5 font-medium border-slate-200",
                                viewMode === "kanban"
                                    ? "bg-slate-700 text-white hover:bg-slate-600 border-slate-700"
                                    : "text-slate-600 hover:bg-slate-50"
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
            <div className="border border-t-0 rounded-b-lg overflow-hidden shadow-sm bg-white">
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
                    </div>
                )}
            </div>
        </div>
    );
}
