import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(packageDir, "src/styles");
const targetDir = resolve(packageDir, "dist/styles");

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
