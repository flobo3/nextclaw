import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const CHANGESET_DIR = join(process.cwd(), ".changeset");
const ROOT_DIR = process.cwd();
const WORKSPACE_ROOTS = ["packages", "apps", "workers"];
const RELEASE_GROUPS = [
  ["@nextclaw/mcp", "@nextclaw/server", "nextclaw"]
];

const readPendingPackages = () => {
  const files = readdirSync(CHANGESET_DIR).filter(
    (entry) => entry.endsWith(".md") && entry !== "README.md"
  );
  const packages = new Set();
  for (const file of files) {
    const content = readFileSync(join(CHANGESET_DIR, file), "utf8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      continue;
    }
    for (const line of match[1].split("\n")) {
      const packageMatch = line.match(/^[\"']([^\"']+)[\"']\s*:/);
      if (packageMatch) {
        packages.add(packageMatch[1]);
      }
    }
  }
  return packages;
};

const pendingPackages = readPendingPackages();
const failures = RELEASE_GROUPS.map((group) => {
  const selected = group.filter((name) => pendingPackages.has(name));
  if (selected.length === 0 || selected.length === group.length) {
    return null;
  }
  return {
    group,
    selected,
    missing: group.filter((name) => !pendingPackages.has(name))
  };
}).filter(Boolean);

if (failures.length > 0) {
  console.error("Release group check failed.");
  for (const failure of failures) {
    console.error(`- group: ${failure.group.join(", ")}`);
    console.error(`  selected: ${failure.selected.join(", ")}`);
    console.error(`  missing: ${failure.missing.join(", ")}`);
  }
  process.exit(1);
}

const collectPackageJsonFiles = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const packageFiles = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      packageFiles.push(...collectPackageJsonFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name === "package.json") {
      packageFiles.push(entryPath);
    }
  }
  return packageFiles;
};

const publishGuardFailures = WORKSPACE_ROOTS.flatMap((workspaceRoot) => {
  const absoluteWorkspaceRoot = join(ROOT_DIR, workspaceRoot);
  return collectPackageJsonFiles(absoluteWorkspaceRoot)
    .map((packageFile) => {
      const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
      if (pkg.private !== false) {
        return null;
      }
      const expectedCommand = `node ${relative(
        packageFile.replace(/package\.json$/, ""),
        join(ROOT_DIR, "scripts", "ensure-pnpm-publish.mjs")
      ).replaceAll("\\", "/")}`;
      const actualCommand = pkg.scripts?.prepublishOnly;
      if (actualCommand === expectedCommand) {
        return null;
      }
      return {
        packageFile: relative(ROOT_DIR, packageFile).replaceAll("\\", "/"),
        expectedCommand,
        actualCommand: typeof actualCommand === "string" ? actualCommand : null
      };
    })
    .filter(Boolean);
});

if (publishGuardFailures.length > 0) {
  console.error("Publish guard check failed.");
  for (const failure of publishGuardFailures) {
    console.error(`- package: ${failure.packageFile}`);
    console.error(`  expected prepublishOnly: ${failure.expectedCommand}`);
    console.error(`  actual prepublishOnly: ${failure.actualCommand ?? "<missing>"}`);
  }
  process.exit(1);
}

console.log("Release group and publish guard checks passed.");
