import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// DB tests (Phase 9+): PGlite-backed `*.db.test.ts`. Run with `npm run test:db`.
export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "server-only": r("./src/game/cards/testing/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
