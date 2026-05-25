import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./error-feedback.css";
import { Providers } from "@/lib/providers";
import { PageErrorBoundary } from "@/components/ui/error-boundary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Travel CRM",
  description: "Next Gen Travel CRM",
};

import { Toaster } from "@/components/ui/sonner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <PageErrorBoundary>
          <Providers session={session}>
            {children}
            <Toaster />
          </Providers>
        </PageErrorBoundary>
      </body>
    </html>
  );
}
