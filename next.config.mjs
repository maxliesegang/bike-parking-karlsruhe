/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
    basePath: '/bike-parking-karlsruhe'
  }
  
export default nextConfig;
