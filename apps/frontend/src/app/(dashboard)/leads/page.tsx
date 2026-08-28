import { Suspense } from "react";
import LeadsClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await searchParams;
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading leads...</div>}>
            <LeadsClientPage />
        </Suspense>
    );
}
