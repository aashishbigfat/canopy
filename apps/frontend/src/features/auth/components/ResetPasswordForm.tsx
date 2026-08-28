"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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

const resetPasswordSchema = z.object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isInvalidToken, setIsInvalidToken] = useState(false);

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            new_password: "",
            confirm_password: "",
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

    useEffect(() => {
        if (!token) {
            setIsInvalidToken(true);
        }
    }, [token]);

    async function onSubmit(data: ResetPasswordValues) {
        if (!token) {
            toast.error("Error", {
                description: "Invalid or missing reset token",
            });
            return;
        }

        setIsLoading(true);

        try {
            await ErrorHandler.withErrorHandling(async () => {
                try {
                    await authService.resetPassword({
                        token,
                        new_password: data.new_password,
                    });
                    setIsSuccess(true);
                    toast.success("Password reset successful", {
                        description: "You can now log in with your new password.",
                    });
                } catch (error: any) {
                    const mapped = handleBackendErrors(ErrorHandler.parseError(error, "Failed to reset password"));
                    if (!mapped) throw error;
                }
            }, "Failed to reset password");
        } catch (error: any) {
            // Error handled
        } finally {
            setIsLoading(false);
        }
    }

    if (isInvalidToken) {
        return (
            <div className="flex flex-col items-center space-y-4 text-center">
                <XCircle className="h-12 w-12 text-red-500" />
                <h3 className="text-lg font-semibold">Invalid Reset Link</h3>
                <p className="text-sm text-muted-foreground">
                    The reset link is invalid or has expired. Please request a new one.
                </p>
                <Button onClick={() => router.push("/forgot-password")}>
                    Request New Link
                </Button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center space-y-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-semibold">Password reset successful!</h3>
                <p className="text-sm text-muted-foreground">
                    Your password has been reset. You can now log in with your new password.
                </p>
                <Button onClick={() => router.push("/login")}>
                    Go to Login
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="new_password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        {...field}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirm_password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        {...field}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Password
                    </Button>
                </form>
            </Form>
        </div>
    );
}

export function ResetPasswordForm() {
    return (
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
            <ResetPasswordFormContent />
        </Suspense>
    );
}
