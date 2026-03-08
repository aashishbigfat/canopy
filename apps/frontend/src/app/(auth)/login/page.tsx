import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
    title: "Login | Tutterfly CRM",
    description: "Login to your account",
};

export default function LoginPage() {
    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-primary" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Building2 className="mr-2 h-6 w-6" />
                    Tutterfly CRM
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;The next generation travel CRM for modern agencies.&rdquo;
                        </p>
                        <footer className="text-sm">Tutterfly Team</footer>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
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
