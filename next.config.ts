import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⬅️ no corta el build por errores de ESLint
  },
  // Si también quisieras ignorar errores de tipos (no necesario para tu caso):
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
