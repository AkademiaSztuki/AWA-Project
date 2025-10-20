/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co', 'modal-api-domain.com'],
  },
  // Podstawowe optymalizacje
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(gltf|glb)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/models/',
          outputPath: 'static/models/',
        },
      },
    });
    
    return config;
  },
};

module.exports = nextConfig;
