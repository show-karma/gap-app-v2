const removeImports = require("next-remove-imports");

/** @type {import('next').NextConfig} */
const nextConfig = removeImports({
  reactStrictMode: true,
});

module.exports = nextConfig;
