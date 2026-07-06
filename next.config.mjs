/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ISR: revalidate claim and topic pages every hour
  // Individual pages can override with `export const revalidate = N`
  experimental: {
    // Enable ISR for dynamic routes
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
