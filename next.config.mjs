/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['google-play-scraper'],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
