"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Building2, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const INDUSTRY_LABELS: Record<string, string> = {
    it: "IT",
    finance: "Finance",
    education: "Education",
};

function ComingSoonContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const industry = searchParams.get("industry") ?? "";
    const industryLabel = INDUSTRY_LABELS[industry] ?? industry;

    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left panel */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-primary" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Building2 className="mr-2 h-6 w-6" />
                    Travel CRM
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;The future of industry-specific CRM, coming soon.&rdquo;
                        </p>
                        <footer className="text-sm">Travel CRM Team</footer>
                    </blockquote>
                </div>
            </div>

            {/* Right panel */}
            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] text-center">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="rounded-full bg-primary/10 p-6">
                            <Clock className="h-12 w-12 text-primary" />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Coming Soon</h1>
                        <p className="text-muted-foreground text-base">
                            The{" "}
                            <span className="font-semibold text-primary">{industryLabel}</span>{" "}
                            CRM is currently under development.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            We&apos;re working hard to bring you a tailored CRM experience for
                            the {industryLabel} industry. Stay tuned!
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className="mx-auto flex items-center gap-2"
                        onClick={() => router.push("/login")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ComingSoonPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>}>
            <ComingSoonContent />
        </Suspense>
    );
}
