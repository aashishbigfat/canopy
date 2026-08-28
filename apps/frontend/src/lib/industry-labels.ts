"use client";
/**
 * Industry Labels — Dynamic naming convention system for the multi-industry CRM.
 *
 * MINIMAL renaming philosophy: Only rename what is absolutely necessary for the
 * industry to make sense. Keep core CRM terms (Leads, Accounts, Opportunities,
 * Contacts) the same unless the industry standard truly demands a different name.
 *
 * Usage:
 *   const labels = useIndustryLabels();
 *   <h1>{labels.suppliers}</h1>  // "Vendors" for manufacturing
 */

import { useSession } from "next-auth/react";

export type IndustryType = "travel" | "healthcare" | "education" | "manufacturing";

export interface IndustryLabelMap {
    // Core entity names (singular + plural)
    lead: string;
    leads: string;
    opportunity: string;
    opportunities: string;
    supplier: string;
    suppliers: string;
    account: string;
    accounts: string;
    // Form section titles
    pipelineSection: string;
    // Primary industry fields shown in forms
    industryFields: string[];
}

export const INDUSTRY_LABELS: Record<IndustryType, IndustryLabelMap> = {
    travel: {
        lead: "Lead",
        leads: "Leads",
        opportunity: "Opportunity",
        opportunities: "Opportunities",
        supplier: "Supplier",
        suppliers: "Suppliers",
        account: "Account",
        accounts: "Accounts",
        pipelineSection: "Travel Requirements",
        industryFields: ["Travel Date", "Destinations", "No. of Pax", "Nights", "Experience"],
    },
    healthcare: {
        lead: "Lead",
        leads: "Leads",
        opportunity: "Opportunity",
        opportunities: "Opportunities",
        supplier: "Provider",
        suppliers: "Providers",
        account: "Account",
        accounts: "Accounts",
        pipelineSection: "Clinical Details",
        industryFields: ["Referral Source", "Insurance", "Chief Complaint", "Urgency", "Patient Type"],
    },
    education: {
        lead: "Lead",
        leads: "Leads",
        opportunity: "Opportunity",
        opportunities: "Opportunities",
        supplier: "Supplier",
        suppliers: "Suppliers",
        account: "Account",
        accounts: "Accounts",
        pipelineSection: "Academic Details",
        industryFields: ["Program", "Academic Term", "GPA", "Qualification", "Sponsorship"],
    },
    manufacturing: {
        lead: "Lead",
        leads: "Leads",
        opportunity: "Opportunity",
        opportunities: "Opportunities",
        supplier: "Vendor",
        suppliers: "Vendors",
        account: "Account",
        accounts: "Accounts",
        pipelineSection: "Production Requirements",
        industryFields: ["Product Category", "Quantity", "UOM", "Delivery Date", "Specs"],
    },
};

/**
 * React hook — returns the label map for the current tenant's industry.
 * Falls back to "travel" if no industry is set on the session.
 */
export function useIndustryLabels(): IndustryLabelMap {
    const { data: session } = useSession();
    const industry = ((session?.user as any)?.industry ?? "travel") as IndustryType;
    return INDUSTRY_LABELS[industry] ?? INDUSTRY_LABELS.travel;
}

/**
 * React hook — returns the current tenant's industry identifier.
 */
export function useIndustry(): IndustryType {
    const { data: session } = useSession();
    return ((session?.user as any)?.industry ?? "travel") as IndustryType;
}

/**
 * React hook — returns the current tenant's enabled modules.
 */
export function useModules(): Record<string, boolean> {
    const { data: session } = useSession();
    return (session?.user as any)?.modules ?? {};
}
