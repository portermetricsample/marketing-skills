/**
 * Porter report template — Next.js static export config.
 *
 * Hard constraints (the report runs inside the Porter wrapper iframe, served
 * path-by-id under /{id}/app/{token}/ with an injected <base href>):
 *   - output:'export'        → emits a static `out/` (index.html as SPA entry).
 *   - assetPrefix:'.'        → asset URLs are RELATIVE, so they resolve against
 *                              the injected <base href> (the report id + token).
 *                              Absolute `/_next/...` would resolve to the origin
 *                              root and break (wrong report). DO NOT remove.
 *   - images.unoptimized     → no Next image server in a static export.
 *   - no basePath            → the id/token live in the served <base href>, not
 *                              baked into files (keeps bytes id-independent so a
 *                              report can be duplicated by copying objects).
 *   - single page + client views → no late code-split chunks (the asset token in
 *                              the path can expire); navigation is client-side.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  assetPrefix: '.',
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
