import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    env: { DATABASE_URL: "memory://", DINO_DATA_MODE: "demo", FX_PROVIDER: "builtin" },
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
