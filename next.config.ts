import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bibliotecas de extração de PDF/DOCX rodam direto no Node, sem bundling.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
