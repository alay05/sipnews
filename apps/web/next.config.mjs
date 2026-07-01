import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sipnews/contracts"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sipnews/contracts": path.resolve("../../packages/contracts/src/index.ts")
    };
    return config;
  }
};

export default nextConfig;
