import type { SalesStage } from "@/lib/api/services/opportunities.service";

// Central definition of allowed sales stages and their default probabilities
// Order here controls how stages are displayed in dropdowns / kanban.
const STAGE_DEFINITIONS: { name: string; probability: number }[] = [
    { name: "Received", probability: 10 },
    { name: "Qualified", probability: 20 },
    { name: "Proposal", probability: 30 },
    { name: "Closed Won", probability: 100 },
    { name: "Closed Lost", probability: 0 },
];

export type StageWithProbability = SalesStage & { probability: number };

/**
 * Filter raw stages coming from the API to only the ones we support,
 * and enforce a consistent ordering and probability value.
 */
export function normalizeSalesStages(stages: SalesStage[] | undefined | null): StageWithProbability[] {
    if (!stages || stages.length === 0) return [];

    return STAGE_DEFINITIONS
        .map(def => {
            const apiStage = stages.find(s => s.name === def.name);
            if (!apiStage) return undefined;
            return {
                ...apiStage,
                probability: apiStage.probability ?? def.probability,
            };
        })
        .filter((s): s is StageWithProbability => Boolean(s));
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

