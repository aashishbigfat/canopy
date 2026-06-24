import type { NextConfig } from "next";
import path from "node:path";

// Pin Turbopack to the npm workspaces root (D:\tutterfly), NOT to apps/frontend.
// `next` is hoisted to D:\tutterfly\node_modules\next, so if Turbopack's root
// is apps/frontend it can't see the next package at all and fails with
// "couldn't find next/package.json".
//
// We need a root that is:
//   - HIGH ENOUGH that node_modules/next is inside it (the monorepo root)
//   - LOW ENOUGH that D:\bun.lock (one level above) is outside it
//
// `next dev` runs from apps/frontend, so process.cwd() == apps/frontend, and
// `..\..` from there is the monorepo root D:\tutterfly.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "..", ".."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, assets, etc.) during local `next dev`.
// Required by the @opennextjs/cloudflare adapter.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
