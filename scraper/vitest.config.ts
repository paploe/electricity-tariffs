/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    coverage: {
      provider: "v8", // 'istanbul' 'v8'
    },
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
