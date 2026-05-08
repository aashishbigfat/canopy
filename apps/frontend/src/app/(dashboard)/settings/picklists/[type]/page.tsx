import { PicklistsManager } from "@/features/settings/PicklistsManager";
import type { PicklistType } from "@/lib/api/services/picklists.service";

const VALID: PicklistType[] = [
  "industry",
  "account_type",
  "account_source",
  "supplier_service",
  "sales_stage",
  "opportunity_type",
  "experience",
  "opportunity_tag",
  "lead_status",
  "source",
  "source_medium",
  "salutation",
  "task_priority",
  "task_status",
  "inclusion",
  "supplier_type",
  "destination",
  "itinerary_inclusion",
];

export default async function PicklistTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const safeType = (VALID.includes(type as PicklistType) ? type : "lead_status") as PicklistType;
  return <PicklistsManager type={safeType} />;
}
