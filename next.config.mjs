/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // the Zama SDK ships WASM (tfhe/tkms) and references node-only
    // modules it never uses in the browser entry.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      // Optional deps of the WalletConnect/MetaMask connectors that never load
      // in a browser build: pino's pretty-printer and React Native's storage.
      // Stub them so webpack doesn't warn about unresolved optional requires.
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
  // Cross-origin isolation lets the TFHE WASM use SharedArrayBuffer + worker
  // threads for input-proof generation (the unwrap encrypt step). Without it
  // the proof runs single-threaded on the main thread and freezes the UI for
  // ~30s. COEP `credentialless` keeps the wallet modal / cross-origin assets
  // working (vs. the stricter `require-corp`).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
