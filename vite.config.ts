import { defineConfig } from "vite";

// GitHub Pages project site phục vụ ở /<tên-repo>/ — workflow truyền VITE_BASE.
// Chạy local (npm run dev) thì base = "/".
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  build: {
    target: "es2020",
    sourcemap: true,
  },
});
