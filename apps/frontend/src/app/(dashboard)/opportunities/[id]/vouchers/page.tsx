import { VouchersTab } from "@/features/opportunity-workflow/VouchersTab";

export default async function VouchersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <VouchersTab opportunityId={id} />
    </div>
  );
}
