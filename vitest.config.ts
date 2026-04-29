import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/test/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "src/test/**",
        "**/*.config.*",
        "prisma/**",
        "src/lib/**/types.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
