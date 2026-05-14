import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output para deploy eficiente en Railway/Docker
  output: "standalone",
};

export default nextConfig;
