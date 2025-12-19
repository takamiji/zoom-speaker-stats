import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["starlessly-postdiphtheric-kaeden.ngrok-free.dev"],
    headers: {
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "frame-ancestors https://zoom.us https://*.zoom.us https://*.ngrok-free.dev; script-src 'self' https://appssdk.zoom.us 'unsafe-inline' 'unsafe-eval'; object-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
