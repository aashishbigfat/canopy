import { Suspense } from "react";
import LeadsClientPage from "./client-page";

export default function LeadsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading leads...</div>}>
            <LeadsClientPage />
        </Suspense>
    );
}
