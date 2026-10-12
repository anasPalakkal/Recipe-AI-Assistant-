/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.30.176.1"],
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/docs": ["../../docs/api.md"],
  },
};

export default nextConfig;
