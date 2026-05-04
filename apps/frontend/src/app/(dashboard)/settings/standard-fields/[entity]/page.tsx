import { notFound } from "next/navigation";
import { EntityTabs } from "@/features/settings/EntityTabs";
import { StandardFieldsManager } from "@/features/settings/StandardFieldsManager";
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

export default async function StandardFieldsPage({
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
      <EntityTabs basePath="/settings/standard-fields" entity={entity as EntityType} />
      <StandardFieldsManager entity={entity as EntityType} />
    </div>
  );
}
