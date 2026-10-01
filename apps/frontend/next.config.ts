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
const workspaceRoot = path.resolve(process.cwd(), "..", "..");

// The Docker image (apps/frontend/Dockerfile, Cloud Run) sets NEXT_STANDALONE=true
// to emit a self-contained server at .next/standalone/apps/frontend/server.js.
const isStandaloneBuild = process.env.NEXT_STANDALONE === "true";

const nextConfig: NextConfig = {
  output: isStandaloneBuild ? "standalone" : undefined,
  outputFileTracingRoot: isStandaloneBuild ? workspaceRoot : undefined,
  turbopack: {
    root: workspaceRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep browser-only heavy libraries (jspdf) out of the server bundle so the
  // Cloudflare Worker stays under the size limit. These are only ever invoked
  // inside client event handlers, never during SSR.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        jspdf: false,
        "jspdf-autotable": false,
      };
    }
    return config;
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, assets, etc.) during local `next dev`.
// Required by the @opennextjs/cloudflare adapter. Skipped for the Docker build,
// which doesn't target Cloudflare.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
if (!isStandaloneBuild) {
  initOpenNextCloudflareForDev();
}
