/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" } // if you add Google later
    ],
  },
}
module.exports = nextConfig