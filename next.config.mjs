/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.canvg = false;
    config.resolve.alias.html2canvas = false;
    config.resolve.alias.dompurify = false;
    return config;
  },
  turbopack: {}
}

export default nextConfig
