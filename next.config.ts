import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7's generated client lazily imports its query-compiler wasm by
  // path (query_compiler_fast_bg.postgresql.mjs). Webpack tries to follow that
  // dynamic import at build time and fails to resolve it, which breaks every
  // route that touches the database. Keeping Prisma out of the server bundle
  // lets Node resolve those files at runtime, where they exist.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
