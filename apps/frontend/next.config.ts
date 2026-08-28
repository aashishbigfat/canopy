import type { NextConfig } from "next";
import { createRequire } from "node:module";
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

// Enables Cloudflare bindings only when explicitly requested. Plain local
// `next dev` should not fail if the optional Cloudflare adapter is not installed.
if (process.env.OPENNEXT_CLOUDFLARE_DEV === "1") {
  try {
    const require = createRequire(import.meta.url);
    const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  } catch {
    console.warn(
      "OPENNEXT_CLOUDFLARE_DEV=1 but @opennextjs/cloudflare is not installed."
    );
  }
}
