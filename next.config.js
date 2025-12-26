/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore canvas module (we use browser canvas)
    config.resolve.alias.canvas = false;
    
    // Handle pdf.js worker
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/legacy/build/pdf';
    
    return config;
  },
};

module.exports = nextConfig;