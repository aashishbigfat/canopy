import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AccountDetailView } from "@/features/accounts/components/AccountDetailView";

async function getAccountDetail(id: string, token: string) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/accounts/${id}?include_related=true`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    if (!res.ok) {
        if (res.status === 404) {
            notFound();
        }
        throw new Error("Failed to fetch account");
    }

    return res.json();
}

export default async function AccountDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        notFound();
    }

    const account = await getAccountDetail(params.id, session.accessToken);

    return (
        <div className="space-y-6">
            <AccountDetailView account={account} />
        </div>
    );
}
