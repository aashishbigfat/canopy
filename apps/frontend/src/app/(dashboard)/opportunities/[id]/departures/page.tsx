import { DeparturesTab } from "@/features/opportunity-workflow/DeparturesTab";

export default async function DeparturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <DeparturesTab opportunityId={id} />
    </div>
  );
}
