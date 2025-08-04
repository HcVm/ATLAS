/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Ignorar archivos .map que rompen el build
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
    });

    // No incluir Puppeteer en el bundle del cliente
    if (isServer) {
      config.externals.push('@sparticuz/chrome-aws-lambda', 'puppeteer-core');
    }

    // 🔹 MUY IMPORTANTE: devolver config siempre
    return config;
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
