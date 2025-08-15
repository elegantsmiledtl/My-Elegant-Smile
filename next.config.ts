
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
        protocol: 'http',
        hostname: 'localhost',
      },
       {
        protocol: 'https',
        hostname: 'elegant-smile-r6jex.web.app',
      },
    ],
  },
};

export default nextConfig;
