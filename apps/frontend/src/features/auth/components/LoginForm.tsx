"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Plane, Stethoscope, GraduationCap, Factory } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const INDUSTRIES = [
    { value: "travel", label: "Travel", icon: Plane, color: "text-blue-600", email: "admin@tutterfly.com" },
    { value: "healthcare", label: "Healthcare", icon: Stethoscope, color: "text-emerald-600", email: "admin-health@tutterfly.com" },
    { value: "education", label: "Education", icon: GraduationCap, color: "text-violet-600", email: "admin-edu@tutterfly.com" },
    { value: "manufacturing", label: "Manufacturing", icon: Factory, color: "text-orange-600", email: "admin-mfg@tutterfly.com" },
] as const;

const loginSchema = z.object({
    industry: z.string().min(1, "Please select an industry"),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            industry: "",
            email: "",
            password: "",
        },
    });

    const selectedIndustry = form.watch("industry");

    async function onSubmit(data: LoginValues) {
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                redirect: false,
                email: data.email,
                password: data.password,
                industry: data.industry,
            });

            if (!result?.ok) {
                toast.error("Login failed", {
                    description: "Invalid email or password",
                });
                return;
            }

            toast.success("Login successful", {
                description: `Welcome to ${INDUSTRIES.find(i => i.value === data.industry)?.label || ""} CRM`,
            });
            router.push(callbackUrl);
            router.refresh();
        } catch (error) {
            toast.error("Error", {
                description: "Something went wrong. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Get current industry config for styling
    const currentIndustry = INDUSTRIES.find(i => i.value === selectedIndustry);

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Industry selector */}
                    <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Industry</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={isLoading}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your industry" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {INDUSTRIES.map((ind) => {
                                            const Icon = ind.icon;
                                            return (
                                                <SelectItem key={ind.value} value={ind.value}>
                                                    <span className="flex items-center gap-2">
                                                        <Icon className={`h-4 w-4 ${ind.color}`} />
                                                        {ind.label}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>
            </Form>
        </div>
    );
}

export function LoginForm() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginFormContent />
        </Suspense>
    );
}

