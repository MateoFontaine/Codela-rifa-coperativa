// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // no corta el build por errores de ESLint
  },
  // Si también querés ignorar errores de TypeScript en el build:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
