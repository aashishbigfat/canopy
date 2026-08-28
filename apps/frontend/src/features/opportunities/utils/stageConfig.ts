import type { SalesStage } from "@/lib/api/services/opportunities.service";

// Legacy travel stage probability defaults — used only as fallback when the
// API stage has no probability set and the name matches.
const LEGACY_PROBABILITY_MAP: Record<string, number> = {
    "Received": 10,
    "Qualified": 20,
    "Proposal": 30,
    "Closed Won": 100,
    "Closed Lost": 0,
    "Refunded": 0,
};

export type StageWithProbability = SalesStage & { probability: number };

/**
 * Accept ALL stages from the API and ensure each has a probability value.
 * Stages are returned in the order the API provided (typically sorted by `sorting`).
 */
export function normalizeSalesStages(stages: SalesStage[] | undefined | null): StageWithProbability[] {
    if (!stages || stages.length === 0) return [];

    return stages.map(stage => ({
        ...stage,
        probability: stage.probability ?? LEGACY_PROBABILITY_MAP[stage.name] ?? 10,
    }));
}

/**
 * Convenience helper: get probability for a given stage id using the
 * normalized list.
 */
export function getProbabilityForStageId(
    stageId: string | undefined,
    stages: StageWithProbability[]
): number | undefined {
    if (!stageId) return undefined;
    const stage = stages.find(s => s.id === stageId);
    return stage?.probability;
}


// Industry-specific close lost reasons
const CLOSE_LOST_REASONS_MAP: Record<string, string[]> = {
    travel: [
        "Too late to respond",
        "Client changed the destination",
        "Offered rates did not match client's expectations",
        "Client not responding",
        "Travel Plan Cancelled",
        "Travel Plan Postponed",
        "Booked with other Travel Agent",
        "Did not inquire",
        "Duplicate Query",
        "Information Required",
    ],
    healthcare: [
        "Patient chose another provider",
        "Insurance not accepted",
        "Cost too high",
        "Patient not responding",
        "Treatment no longer needed",
        "Referred elsewhere",
        "Duplicate record",
        "Patient moved / relocated",
    ],
    education: [
        "Chose another institution",
        "Financial constraints",
        "Did not meet admission criteria",
        "Student not responding",
        "Application withdrawn",
        "Visa denied",
        "Duplicate application",
        "Program no longer available",
    ],
    manufacturing: [
        "Lost to competitor",
        "Budget constraints",
        "Requirements changed",
        "Client not responding",
        "Specifications not met",
        "Delivery timeline mismatch",
        "Duplicate RFQ",
        "Project cancelled",
    ],
};

/** Get close-lost reasons for the given industry. Falls back to a generic list. */
export function getCloseLostReasons(industry?: string): string[] {
    return CLOSE_LOST_REASONS_MAP[industry || "travel"] || CLOSE_LOST_REASONS_MAP.travel;
}

// Backward-compatible export (defaults to travel)
export const CLOSE_LOST_REASONS = CLOSE_LOST_REASONS_MAP.travel;
