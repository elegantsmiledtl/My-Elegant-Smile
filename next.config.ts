
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
       {
        protocol: 'https',
        hostname: 'elegant-smile-r6jex.web.app',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      }
    ],
  },
};

export default nextConfig;
