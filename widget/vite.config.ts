import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  publicDir: false,
  css: {
    postcss: {
      plugins: [tailwindcss({ config: resolve(__dirname, "tailwind.config.ts") })],
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "entry.tsx"),
      name: "KarmaChat",
      fileName: () => "karma-chat.js",
      formats: ["iife"],
    },
    outDir: resolve(__dirname, "../public/widget"),
    emptyOutDir: true,
    minify: "esbuild",
    cssCodeSplit: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "UNRESOLVED_IMPORT") {
          throw new Error(`Forbidden import detected: ${warning.message}`);
        }
        warn(warning);
      },
      external: (id) => {
        const forbidden = [
          /^next\//,
          /@tanstack\/react-query/,
          /@privy-io\//,
          /hooks\/useAuth/,
          /hooks\/useAgentContextSync/,
          /utilities\/auth\/token-manager/,
          /utilities\/enviromentVars/,
          /utilities\/pages$/,
          /utilities\/queryKeys/,
          /AgentChat\/ConfirmationCard/,
        ];
        if (forbidden.some((re) => re.test(id))) {
          throw new Error(
            `Tree-shaking violation: "${id}" must not enter the widget bundle. Check the import chain.`
          );
        }
        return false;
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
