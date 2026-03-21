import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/codex-model-provider.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  bundle: false,
  target: "es2022",
  clean: true
});
