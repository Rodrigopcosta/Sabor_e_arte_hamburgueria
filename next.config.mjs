/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // TEMP: reativar após testes do MP
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig