import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { nextRuntime, webpack }) => {
    console.log("--- Webpack Build Runtime:", nextRuntime);
    if (nextRuntime === 'edge') {
      config.node = {
        ...config.node,
        __dirname: 'mock',
      };
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify('/'),
        })
      );
    }
    return config;
  },
};

export default nextConfig;
