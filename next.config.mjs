// E2E runs build into their own folder so that a running `next dev` (which rewrites .next) cannot break them.
const nextConfig = { reactStrictMode: true, distDir: process.env.NEXT_DIST_DIR || ".next" }; export default nextConfig;
