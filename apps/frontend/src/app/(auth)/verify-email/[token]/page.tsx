"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { miscService } from "@/lib/api/services/misc.service";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    miscService
      .verifyEmail(token)
      .then((r) => {
        setState("ok");
        setMessage(r?.already_used ? "Email was already verified." : "Email verified.");
      })
      .catch((e) => {
        setState("fail");
        setMessage(e?.response?.data?.detail || "Verification failed");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border p-6 text-center space-y-4">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <div className="text-lg font-semibold">Verifying…</div>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <div className="text-lg font-semibold">{message}</div>
            <Link href="/login" className="block text-sm text-blue-600 hover:underline">
              Continue to login
            </Link>
          </>
        )}
        {state === "fail" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-600" />
            <div className="text-lg font-semibold">Verification failed</div>
            <div className="text-sm text-muted-foreground">{message}</div>
            <Link href="/login" className="block text-sm text-blue-600 hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
