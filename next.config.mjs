/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
    // Ignorar .map para evitar errores de puppeteer
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
    });

    // Evitar incluir Puppeteer/Chromium en el cliente
    if (isServer) {
      config.externals.push('@sparticuz/chromium', 'puppeteer-core');
    }

    return config; // IMPORTANTE: siempre retornar config
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
};

export default nextConfig;
