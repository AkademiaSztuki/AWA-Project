/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'zcaaqbbcqpkzunepnhpb.supabase.co',  // Supabase storage
      'your-supabase-project.supabase.co', 
      'modal-api-domain.com'
    ],
    // Optymalizacja obrazów - konwersja na WebP/AVIF i kompresja
    formats: ['image/avif', 'image/webp'],
    // Jakość kompresji (1-100, 75 to dobry balans)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum cache time (60 dni)
    minimumCacheTTL: 60 * 24 * 60 * 60,
  },
  // Podstawowe optymalizacje
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  swcMinify: true,
  
  // Headers dla plików binarnych i GLTF
  async headers() {
    return [
      {
        source: '/model/:path*.bin',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/model/:path*.gltf',
        headers: [
          {
            key: 'Content-Type',
            value: 'model/gltf+json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  
  webpack: (config) => {
    // Usuń reguły dla GLTF/GLB - pliki w public/ są serwowane bezpośrednio
    // config.module.rules.push({
    //   test: /\.(gltf|glb)$/,
    //   use: {
    //     loader: 'file-loader',
    //     options: {
    //       publicPath: '/_next/static/models/',
    //       outputPath: 'static/models/',
    //     },
    //   },
    // });
    
    return config;
  },
};

module.exports = nextConfig;
