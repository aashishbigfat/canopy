"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
    searchService,
    SEARCH_MODULES,
    AccountSearchItem,
    ContactSearchItem,
    FileSearchItem,
    LeadSearchItem,
    OpportunitySearchItem,
    PersonAccountSearchItem,
    SupplierSearchItem,
    SearchModuleValue,
} from "@/lib/api/services/search.service";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/lib/industry-labels";

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function shortenId(id: string): string {
    // Return last 10 chars as zero-padded numeric (mimics CRM display)
    return id.slice(-10).replace(/[a-f]/g, "0");
}

// ─── Table shells ─────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap border-b">
            {children}
        </th>
    );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <td className={`py-2.5 px-4 text-sm border-b border-muted/50 ${className ?? ""}`}>
            {children}
        </td>
    );
}

function ResultLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-[#1a6bb0] hover:underline font-medium">
            {children}
        </Link>
    );
}

// ─── Module Tables ────────────────────────────────────────────────────────────

function AccountsTable({ items }: { items: AccountSearchItem[] }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>Account Name</Th>
                    <Th>Phone</Th>
                    <Th>Billing Street</Th>
                    <Th>Billing City</Th>
                    <Th>Owner</Th>
                    <Th>Account ID</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td><ResultLink href={row.url}>{row.account_name}</ResultLink></Td>
                        <Td>{row.phone || "-"}</Td>
                        <Td>{row.billing_street || "-"}</Td>
                        <Td>{row.billing_city || "-"}</Td>
                        <Td>{row.owner || "-"}</Td>
                        <Td className="text-muted-foreground font-mono text-xs">{shortenId(row.account_id)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ContactsTable({ items }: { items: ContactSearchItem[] }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>First Name</Th>
                    <Th>Last Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Mobile</Th>
                    <Th>Owner</Th>
                    <Th>Contact ID</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td><ResultLink href={row.url}>{row.first_name}</ResultLink></Td>
                        <Td><ResultLink href={row.url}>{row.last_name}</ResultLink></Td>
                        <Td>{row.email || "-"}</Td>
                        <Td>{row.phone || "-"}</Td>
                        <Td>{row.mobile || "-"}</Td>
                        <Td>{row.owner || "-"}</Td>
                        <Td className="text-muted-foreground font-mono text-xs">{shortenId(row.contact_id)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function FilesTable({ items }: { items: FileSearchItem[] }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>Title</Th>
                    <Th>Owner</Th>
                    <Th>Last Modified Date</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td><ResultLink href={row.url}>{row.title}</ResultLink></Td>
                        <Td>{row.owner || "-"}</Td>
                        <Td>{formatDate(row.last_modified_date)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function LeadsTable({ items }: { items: LeadSearchItem[] }) {
    const router = useRouter();

    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>Lead ID</Th>
                    <Th>First Name</Th>
                    <Th>Last Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Company</Th>
                    <Th>City of Origin</Th>
                    <Th>Source</Th>
                    <Th>Create Date</Th>
                    <Th>Action</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td className="font-mono text-xs text-muted-foreground">
                            <ResultLink href={row.url}>{String(row.lead_id).slice(-6)}</ResultLink>
                        </Td>
                        <Td><ResultLink href={row.url}>{row.first_name}</ResultLink></Td>
                        <Td><ResultLink href={row.url}>{row.last_name}</ResultLink></Td>
                        <Td>{row.email || "-"}</Td>
                        <Td>{row.phone || "-"}</Td>
                        <Td>{row.company || "-"}</Td>
                        <Td>{row.city_of_origin || "-"}</Td>
                        <Td>{row.source || "-"}</Td>
                        <Td>{formatDate(row.create_date)}</Td>
                        <Td>
                            {!row.is_converted ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => router.push(`/leads/${row.id}?action=convert`)}
                                >
                                    Convert
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground">Converted</span>
                            )}
                        </Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function OpportunitiesTable({ items, industry }: { items: OpportunitySearchItem[]; industry: string }) {
    // Industry-aware column headers and cells
    const industryColHeaders = industry === "travel"
        ? ["Experience", "Travel Date"]
        : industry === "healthcare"
        ? ["Treatment Type", "Urgency"]
        : industry === "education"
        ? ["Program", "Admission Status"]
        : industry === "manufacturing"
        ? ["Product", "Quantity"]
        : ["Details", "Status"];

    function getIndustryCells(row: OpportunitySearchItem) {
        const idata = row.industry_data || {};
        if (industry === "travel") {
            return [row.experience || "-", formatDate(row.travel_date)];
        } else if (industry === "healthcare") {
            return [idata.treatment_type || "-", idata.urgency || "-"];
        } else if (industry === "education") {
            return [idata.program || "-", idata.admission_status || "-"];
        } else if (industry === "manufacturing") {
            return [idata.product_category || "-", idata.quantity_ordered || "-"];
        }
        return ["-", "-"];
    }

    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>Opportunity Name</Th>
                    <Th>{industryColHeaders[0]}</Th>
                    <Th>Account Name</Th>
                    <Th>Sales Stage</Th>
                    <Th>{industryColHeaders[1]}</Th>
                    <Th>Close Date</Th>
                    <Th>Owner</Th>
                    <Th>Create Date</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => {
                    const cells = getIndustryCells(row);
                    return (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                            <Td><ResultLink href={row.url}>{row.opportunity_name}</ResultLink></Td>
                            <Td>{cells[0]}</Td>
                            <Td>{row.account_name || "-"}</Td>
                            <Td>{row.sales_stage || "-"}</Td>
                            <Td>{cells[1]}</Td>
                            <Td>{formatDate(row.close_date)}</Td>
                            <Td>{row.owner || "-"}</Td>
                            <Td>{formatDate(row.create_date)}</Td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function PersonAccountsTable({ items }: { items: PersonAccountSearchItem[] }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>First Name</Th>
                    <Th>Last Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Mobile</Th>
                    <Th>Owner</Th>
                    <Th>P Account ID</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td><ResultLink href={row.url}>{row.first_name}</ResultLink></Td>
                        <Td><ResultLink href={row.url}>{row.last_name}</ResultLink></Td>
                        <Td>{row.email || "-"}</Td>
                        <Td>{row.phone || "-"}</Td>
                        <Td>{row.mobile || "-"}</Td>
                        <Td>{row.owner || "-"}</Td>
                        <Td className="text-muted-foreground font-mono text-xs">{shortenId(row.p_account_id)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SuppliersTable({ items }: { items: SupplierSearchItem[] }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="bg-muted/30">
                    <Th>Supplier Name</Th>
                    <Th>Supplier Type</Th>
                    <Th>Phone</Th>
                    <Th>Email</Th>
                    <Th>Supplier ID</Th>
                </tr>
            </thead>
            <tbody>
                {items.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <Td><ResultLink href={row.url}>{row.supplier_name}</ResultLink></Td>
                        <Td>{row.supplier_type || "-"}</Td>
                        <Td>{row.phone || "-"}</Td>
                        <Td>{row.email || "-"}</Td>
                        <Td className="text-muted-foreground font-mono text-xs">{shortenId(row.supplier_id)}</Td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ─── Results Content ──────────────────────────────────────────────────────────

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const module = (searchParams.get("module") ?? "files") as SearchModuleValue;
    const q = searchParams.get("q") ?? "";
    const industry = useIndustry();

    const moduleLabel =
        SEARCH_MODULES.find((m) => m.value === module)?.label ?? module;

    const limit = 30;
    const { 
        data, 
        isLoading, 
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["search-by-module", module, q],
        queryFn: ({ pageParam }) => searchService.searchByModule(module, q, pageParam as number, limit),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            if (lastPage.items.length < lastPage.limit) {
                return undefined;
            }
            return lastPage.skip + lastPage.limit;
        },
        enabled: q.length >= 1,
        staleTime: 30_000,
    });

    const allItems = data?.pages.flatMap((page) => page.items) || [];

    if (!q) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                Enter a search query to see results.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">
                Search Result : {moduleLabel}
            </h1>

            <div className="bg-background border rounded-lg overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Searching…</span>
                    </div>
                ) : isError ? (
                    <div className="flex items-center justify-center h-48 text-destructive">
                        Something went wrong. Please try again.
                    </div>
                ) : allItems.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                        No results found for &quot;{q}&quot; in {moduleLabel}.
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className="overflow-x-auto">
                            {module === "accounts" && (
                                <AccountsTable items={allItems as AccountSearchItem[]} />
                            )}
                            {module === "contacts" && (
                                <ContactsTable items={allItems as ContactSearchItem[]} />
                            )}
                            {module === "files" && (
                                <FilesTable items={allItems as FileSearchItem[]} />
                            )}
                            {module === "leads" && (
                                <LeadsTable items={allItems as LeadSearchItem[]} />
                            )}
                            {module === "opportunities" && (
                                <OpportunitiesTable items={allItems as OpportunitySearchItem[]} industry={industry} />
                            )}
                            {module === "person_accounts" && (
                                <PersonAccountsTable items={allItems as PersonAccountSearchItem[]} />
                            )}
                            {module === "suppliers" && (
                                <SuppliersTable items={allItems as SupplierSearchItem[]} />
                            )}
                        </div>
                        {hasNextPage && (
                            <div className="flex justify-center p-4 border-t">
                                <Button
                                    variant="secondary"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        "Load More"
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading…</span>
                </div>
            }
        >
            <SearchResultsContent />
        </Suspense>
    );
}
