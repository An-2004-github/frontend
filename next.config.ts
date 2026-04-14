/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Cho phép tất cả hostname HTTPS (ảnh Cloudinary, upload từ admin, v.v.)
        protocol: "https",
        hostname: "**",
      },
      {
        // Cho phép ảnh HTTP cục bộ (localhost dev)
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;