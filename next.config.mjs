

const nextConfig = {
  experimental: {
    // Required for Server Actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
