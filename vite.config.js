import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/pocket-soundwalk/" : "/",
  worker: { format: "es" },
  build: { target: "es2022" },
});
