import { notFound } from "next/navigation";
import { EntityTabs } from "@/features/settings/EntityTabs";
import { CustomFieldsManager } from "@/features/settings/CustomFieldsManager";
import type { EntityType } from "@/lib/api/services/field-registry.service";

const VALID: EntityType[] = [
  "account",
  "contact",
  "lead",
  "opportunity",
  "supplier",
  "personal_account",
  "task",
];

export default async function CustomFieldsPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!VALID.includes(entity as EntityType)) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <EntityTabs basePath="/settings/custom-fields" entity={entity as EntityType} />
      <CustomFieldsManager entity={entity as EntityType} />
    </div>
  );
}
