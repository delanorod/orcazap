import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "puppeteer",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
