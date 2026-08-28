"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";

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
import { toast } from "sonner";
import { authService } from "@/lib/api/services/auth.service";
import { ErrorHandler, ErrorType } from "@/lib/error-handler";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const handleBackendErrors = (error: any) => {
        if (error.type === ErrorType.VALIDATION && error.details?.detail) {
            const details = error.details.detail;
            details.forEach((err: any) => {
                const field = err.loc[err.loc.length - 1];
                form.setError(field as any, {
                    type: "manual",
                    message: err.msg,
                });
            });
            return true;
        }
        return false;
    };

    async function onSubmit(data: ForgotPasswordValues) {
        setIsLoading(true);

        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    await authService.forgotPassword({ email: data.email });
                    setIsSuccess(true);
                    toast.success("Reset link sent", {
                        description: "If an account exists with this email, you will receive a password reset link.",
                    });
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to send reset link"));
                    if (!mapped) throw error;
                }
            }, "Failed to send reset link");
        } catch (error) {
            // Error handled
        } finally {
            setIsLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center space-y-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-semibold">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                    If an account exists with this email, we have sent a password reset link.
                </p>
                <Link
                    href="/login"
                    className="text-sm text-primary hover:underline underline-offset-4"
                >
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="name@example.com"
                                        {...field}
                                        disabled={isLoading}
                                        type="email"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send reset link
                    </Button>
                </form>
            </Form>
            <p className="text-center text-sm text-muted-foreground">
                <Link
                    href="/login"
                    className="hover:text-brand underline underline-offset-4"
                >
                    Back to login
                </Link>
            </p>
        </div>
    );
}
