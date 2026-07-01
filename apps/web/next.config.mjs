import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sms-news/contracts"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sms-news/contracts": path.resolve("../../packages/contracts/src/index.ts")
    };
    return config;
  }
};

export default nextConfig;
