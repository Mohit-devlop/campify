import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackLocalPostcssConfig: true,
  },
};

export default nextConfig;
