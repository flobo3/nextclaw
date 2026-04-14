#!/usr/bin/env node
import { createPrivateKey, createPublicKey } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_OUTPUT_PATH = "build/update-bundle-public.pem";
const DEFAULT_PUBLISHED_PUBLIC_KEY_URL = "https://Peiiii.github.io/nextclaw/desktop-updates/update-bundle-public.pem";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function normalizePem(value) {
  return value.replaceAll("\\n", "\n");
}

function parsePublicKey(publicKeyPem, sourceLabel) {
  try {
    return createPublicKey(publicKeyPem);
  } catch (error) {
    throw new Error(
      `Invalid desktop update public key from ${sourceLabel}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function resolveOutputPath(args) {
  return resolve(args.output?.trim() || DEFAULT_OUTPUT_PATH);
}

function readInlinePrivateKey(args) {
  return args["private-key"]?.trim() || process.env.NEXTCLAW_DESKTOP_BUNDLE_PRIVATE_KEY?.trim() || "";
}

function readPrivateKeyFile(args) {
  return args["private-key-file"]?.trim() || process.env.NEXTCLAW_DESKTOP_BUNDLE_PRIVATE_KEY_FILE?.trim() || "";
}

function resolvePrivateKey(args) {
  const inlineKey = readInlinePrivateKey(args);
  if (inlineKey) {
    return createPrivateKey(normalizePem(inlineKey));
  }

  const privateKeyFile = readPrivateKeyFile(args);
  if (privateKeyFile) {
    return createPrivateKey(readFileSync(resolve(privateKeyFile), "utf8"));
  }

  return null;
}

async function downloadPublishedPublicKey(args) {
  const url = args["published-public-key-url"]?.trim() || DEFAULT_PUBLISHED_PUBLIC_KEY_URL;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download desktop update public key: ${url} (status ${response.status})`);
  }
  const publicKeyPem = await response.text();
  parsePublicKey(publicKeyPem, url);
  return { publicKeyPem, sourceLabel: url };
}

async function resolvePublicKey(args) {
  const privateKey = resolvePrivateKey(args);
  if (privateKey) {
    const publicKeyPem = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
    parsePublicKey(publicKeyPem, "private-key");
    return { publicKeyPem, sourceLabel: "private-key" };
  }

  return await downloadPublishedPublicKey(args);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = resolveOutputPath(args);
  const result = await resolvePublicKey(args);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result.publicKeyPem, "utf8");
  process.stdout.write(`${outputPath}\n`);
  console.error(`[ensure-bundle-public-key] wrote ${outputPath} from ${result.sourceLabel}`);
}

await main().catch((error) => {
  console.error(`[ensure-bundle-public-key] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
