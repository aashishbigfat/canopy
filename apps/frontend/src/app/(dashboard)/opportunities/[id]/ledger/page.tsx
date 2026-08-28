import { LedgerTab } from "@/features/opportunity-workflow/LedgerTab";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <LedgerTab opportunityId={id} />
    </div>
  );
}
