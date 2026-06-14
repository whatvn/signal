/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
