/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true }, // ← clave
  // Si querés, también podés ignorar errores de TS (no hace falta):
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
