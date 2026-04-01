import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpportunitiesPageClient from "./OpportunitiesPageClient";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    await searchParams;
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return <OpportunitiesPageClient />;
}
