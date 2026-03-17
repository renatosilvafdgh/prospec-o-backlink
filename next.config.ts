import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    // Generate a unique build ID based on the current timestamp
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
