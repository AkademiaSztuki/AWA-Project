/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co', 'modal-api-domain.com'],
  },
  // Optymalizacja bundla - mniej chunków = mniej zapytań
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@react-three/drei', '@react-three/fiber'],
  },
  // Lepsze cache'owanie
  compress: true,
  poweredByHeader: false,
  // Redukcja rozmiaru chunków
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
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
    
    // Optymalizacja split chunks dla redukcji liczby zapytań
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk - wszystkie node_modules razem
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk dla współdzielonego kodu
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
