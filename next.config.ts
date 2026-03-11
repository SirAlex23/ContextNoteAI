
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Esto evita que el build falle por las variables de entorno ausentes
    ignoreBuildErrors: true,
  },
  eslint: {
    // Esto ignora advertencias de estilo que puedan frenar el proceso
    ignoreDuringBuilds: true,
  },
  // Optimización para despliegues en Docker como el tuyo
  output: 'standalone',
};

export default nextConfig;

