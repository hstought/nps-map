import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.nps.gov",
        pathname: "/common/uploads/**",
      },
    ],
  },
};

export default nextConfig;
