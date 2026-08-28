"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { useQueryClient } from "@tanstack/react-query";
import { getCloseLostReasons } from "@/features/opportunities/utils/stageConfig";
import { useIndustry } from "@/lib/industry-labels";
import { X } from "lucide-react";

interface StageOption {
    id: string;
    name: string;
    is_lost?: boolean;
}

interface UpdateStageDialogProps {
    opportunityId: string;
    currentStageId: string;
    stages: StageOption[];
    isOpen: boolean;
    /** Pre-selected target stage (Close Lost stage ID) */
    targetStageId?: string;
    /** Existing reason if any */
    currentReason?: string;
    onClose: () => void;
}

export function UpdateStageDialog({
    opportunityId,
    currentStageId,
    stages,
    isOpen,
    targetStageId,
    currentReason,
    onClose,
}: UpdateStageDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedReason, setSelectedReason] = useState("");
    const [reasonError, setReasonError] = useState("");
    const queryClient = useQueryClient();
    const industry = useIndustry();
    const closeLostReasons = getCloseLostReasons(industry);

    // Initialize state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedReason(currentReason || "");
            setReasonError("");
        }
    }, [isOpen, currentReason]);

    const stageId = targetStageId || stages.find(s => s.is_lost)?.id || "";

    async function handleUpdateStage() {
        if (!selectedReason.trim()) {
            setReasonError("Please select a reason for closing this opportunity.");
            return;
        }

        if (!stageId) {
            toast.error("No Close Lost stage found");
            return;
        }

        setIsLoading(true);
        try {
            await opportunitiesService.updateStage(
                opportunityId,
                stageId,
                selectedReason
            );
            toast.success("Opportunity marked as Close Lost");
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId] });
            queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId, "history"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            onClose();
        } catch (error: any) {
            console.error("Failed to update stage:", error);
            toast.error(error?.response?.data?.detail || "Failed to update stage");
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Red Header */}
                <div className="bg-red-500 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold leading-tight">
                        Are you sure want to lost this<br />Opportunity?
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors ml-4 flex-shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Reason - Lost Opportunity<span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={selectedReason}
                            onValueChange={(val) => {
                                setSelectedReason(val);
                                setReasonError("");
                            }}
                        >
                            <SelectTrigger className={reasonError ? "border-red-500/40 focus:ring-red-500" : ""}>
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {closeLostReasons.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                        {reason}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {reasonError && (
                            <p className="text-xs text-red-500">{reasonError}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted border-t flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Close
                    </Button>
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleUpdateStage}
                        disabled={isLoading}
                    >
                        {isLoading ? "Updating..." : "Update Stage"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
