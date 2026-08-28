import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CreateItineraryClient from "./CreateItineraryClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function CreateItineraryPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <CreateItineraryClient />
        </Suspense>
    );
}
