import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/types.ts"]
    }
  }
});
