import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Eliminamos el bloque 'eslint' que causa el error
  // para que TypeScript deje de marcar el error rojo.
};

export default nextConfig;



