import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SessionExpiredBanner } from "@/features/auth/components/SessionExpiredBanner";

export const metadata: Metadata = {
    title: "Login | Travel CRM",
    description: "Login to your account",
};

export default function LoginPage() {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="relative hidden overflow-hidden border-r border-border/40 lg:flex">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900" />
                <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />

                <div className="relative z-10 flex h-full w-full flex-col p-10 text-white">
                    <div className="flex items-center text-lg font-semibold">
                        <Building2 className="mr-2 h-6 w-6" />
                        Travel CRM
                    </div>

                    <div className="mt-12 max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Modern Workspace</p>
                        <h2 className="mt-3 text-3xl font-semibold leading-tight">
                            Close deals faster with a smarter CRM experience.
                        </h2>
                        <p className="mt-4 text-sm text-white/80">
                            Track leads, opportunities, tasks, and dashboards in one beautiful workflow built for high-velocity teams.
                        </p>
                    </div>

                    <div className="mt-auto">
                        <blockquote className="space-y-2">
                            <p className="text-lg text-white/90">
                                &ldquo;The next generation multi-industry CRM for modern businesses.&rdquo;
                            </p>
                            <footer className="text-sm text-white/70">Travel CRM Team</footer>
                        </blockquote>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Suspense fallback={null}>
                        <SessionExpiredBanner />
                    </Suspense>
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Login to your account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email below to login
                        </p>
                    </div>
                    <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
                        <LoginForm />
                    </Suspense>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        <Link
                            href="/forgot-password"
                            className="hover:text-brand underline underline-offset-4"
                        >
                            Forgot your password?
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
