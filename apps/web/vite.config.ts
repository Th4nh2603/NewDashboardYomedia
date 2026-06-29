import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const fromEnv = Number(process.env.VITE_DEV_PORT);
  const webPort = Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : 3000;

  return {
    envDir: __dirname,
    server: {
      port: webPort,
      host: "0.0.0.0",
      strictPort: false,
      proxy: {
        "/api/trpc": {
          target: env.VITE_SERVER_URL || "http://localhost:4000",
          changeOrigin: true,
          rewrite: (url) => url.replace(/^\/api\/trpc/, "/trpc"),
        },
        "/api/sftp": {
          target: env.VITE_SERVER_URL || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
  };
});
