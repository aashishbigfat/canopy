"use client";

import React from "react";
import { ImportDataDialog, ImportResultData, normalizeImportResult } from "@/components/shared/ImportDataDialog";
import { leadsService } from "@/lib/api/services/leads.service";

interface ImportLeadsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportLeadsDialog({ open, onOpenChange }: ImportLeadsDialogProps) {
    const importFn = async (file: File): Promise<ImportResultData> =>
        normalizeImportResult(await leadsService.importLeadsCsv(file));

    return (
        <ImportDataDialog
            open={open}
            onOpenChange={onOpenChange}
            entityLabel="Leads"
            importFn={importFn}
            downloadSampleFn={leadsService.downloadImportSample}
            invalidateKeys={[["leads"]]}
            checklist={[
                "Columns must match the downloaded sample — First Name and Last Name are required.",
                "Lead Status, Source, Source Medium and Industry must exist as active picklists in Tutterfly.",
                "Phone/Mobile format: +<country code> <number> (e.g. +91 9876543210); 10 digits for India.",
                "Travel Date accepts YYYY-MM-DD, DD-MM-YYYY or DD/MM/YYYY.",
            ]}
        />
    );
}
