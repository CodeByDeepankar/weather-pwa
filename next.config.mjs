/** @type {import('next').NextConfig} */
const nextConfig = {
     images: {
    remotePatterns: [new URL('https://openweathermap.org/**')],
  },
};

export default nextConfig;
