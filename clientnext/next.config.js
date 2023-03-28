const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  productionBrowserSourceMaps: true,
  experimental: {
    "esmExternals": "loose"
  },
  distDir: 'out',
  webpack: (config, context) => {
    config.resolve.alias["@gen"] = path.resolve(__dirname, 'src/gen/')
    return config
  }
}

module.exports = nextConfig
