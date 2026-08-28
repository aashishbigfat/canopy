import { ClaimsTab } from "@/features/opportunity-workflow/ClaimsTab";

export default async function ClaimsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <ClaimsTab opportunityId={id} />
    </div>
  );
}
