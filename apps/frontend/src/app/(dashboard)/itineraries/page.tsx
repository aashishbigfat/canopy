import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ItinerariesClient from "./ItinerariesClient";

export const dynamic = "force-dynamic";

export default async function ItinerariesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return <ItinerariesClient />;
}
