import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AccountDetailView } from "@/features/accounts/components/AccountDetailView";
import { getApiBaseUrlNoSlash } from "@/lib/env";

async function getAccountDetail(id: string, token: string) {
    const res = await fetch(
        `${getApiBaseUrlNoSlash()}/accounts/${id}?include_related=true`,
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

export default async function PersonAccountDetailPage(props: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        notFound();
    }

    const params = await props.params;
    const account = await getAccountDetail(params.id, session.accessToken);

    const { redirect } = await import("next/navigation");

    // Ensure we are viewing the right type of account
    if (!account.is_person_account) {
        redirect(`/accounts/${params.id}`);
    }

    return (
        <div className="space-y-6">
            <AccountDetailView account={account} />
        </div>
    );
}
