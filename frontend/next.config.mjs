/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/backend-api/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      }
    ];
  },
};

export default nextConfig;
