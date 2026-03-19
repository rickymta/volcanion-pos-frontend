import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Blog app — CMS Blog API (port 5003)
   * Public, no auth required, ISR caching
   */
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '55057',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.example.com',
        pathname: '/uploads/**',
      },
    ],
  },
  // Rewrites để proxy API calls trong development
  async rewrites() {
    return [
      {
        source: '/api/cms/:path*',
        destination: `${process.env.CMS_BLOG_API_URL ?? 'http://localhost:5003'}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
