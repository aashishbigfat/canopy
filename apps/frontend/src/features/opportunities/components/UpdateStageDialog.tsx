"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { opportunitiesService } from "@/lib/api/services/opportunities.service";
import { useRouter } from "next/navigation";

const stageUpdateSchema = z.object({
    new_stage_id: z.string().min(1, "Please select a stage"),
    reason: z.string().optional(),
});

type StageUpdateValues = z.infer<typeof stageUpdateSchema>;

interface UpdateStageDialogProps {
    opportunityId: string;
    currentStageId: string;
    stages: { id: string; name: string }[];
    isOpen: boolean;
    onClose: () => void;
}

export function UpdateStageDialog({
    opportunityId,
    currentStageId,
    stages,
    isOpen,
    onClose,
}: UpdateStageDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const form = useForm<StageUpdateValues>({
        resolver: zodResolver(stageUpdateSchema),
        defaultValues: {
            new_stage_id: currentStageId,
            reason: "",
        },
    });

    async function onSubmit(data: StageUpdateValues) {
        if (data.new_stage_id === currentStageId) {
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            await opportunitiesService.updateStage(opportunityId, data.new_stage_id, data.reason);
            toast.success("Opportunity stage updated successfully");
            onClose();
            router.refresh();
        } catch (error: any) {
            console.error("Failed to update stage", error);
            toast.error("Failed to update stage");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Sales Stage</DialogTitle>
                    <DialogDescription>
                        Change the current stage of this opportunity in the sales pipeline.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="new_stage_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Stage</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {stages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Why is this stage being changed?"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Update Stage"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
