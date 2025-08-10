/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is stable in Next.js 14, no experimental flag needed
  webpack: (config, { isServer }) => {
    // Handle PDF.js for client-side rendering
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
      }
    }

    // Handle react-pdf worker loading
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' }
    })

    return config
  },
}

module.exports = nextConfig
