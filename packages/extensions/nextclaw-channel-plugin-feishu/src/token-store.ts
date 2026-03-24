import { execFile as execFileCb } from "node:child_process";
import { mkdir, unlink, readFile, writeFile, chmod } from "node:fs/promises";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

export type StoredUAToken = {
  userOpenId: string;
  appId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
  scope: string;
  grantedAt: number;
};

const KEYCHAIN_SERVICE = "nextclaw-feishu-uat";
const REFRESH_AHEAD_MS = 5 * 60 * 1000;

function accountKey(appId: string, userOpenId: string): string {
  return `${appId}:${userOpenId}`;
}

export function maskToken(token: string): string {
  if (token.length <= 8) {
    return "****";
  }
  return `****${token.slice(-4)}`;
}

type KeychainBackend = {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, data: string): Promise<void>;
  remove(service: string, account: string): Promise<void>;
};

const darwinBackend: KeychainBackend = {
  async get(service, account) {
    try {
      const { stdout } = await execFile("security", [
        "find-generic-password",
        "-s",
        service,
        "-a",
        account,
        "-w",
      ]);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  },

  async set(service, account, data) {
    try {
      await execFile("security", ["delete-generic-password", "-s", service, "-a", account]);
    } catch {
      // no-op
    }
    await execFile("security", [
      "add-generic-password",
      "-s",
      service,
      "-a",
      account,
      "-w",
      data,
    ]);
  },

  async remove(service, account) {
    try {
      await execFile("security", ["delete-generic-password", "-s", service, "-a", account]);
    } catch {
      // no-op
    }
  },
};

const STORAGE_DIR = join(
  process.platform === "win32"
    ? process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? homedir(), "AppData", "Local")
    : process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"),
  KEYCHAIN_SERVICE,
);
const MASTER_KEY_PATH = join(STORAGE_DIR, "master.key");
const MASTER_KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function safeFileName(account: string): string {
  return account.replace(/[^a-zA-Z0-9._-]/g, "_") + ".enc";
}

async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true, mode: 0o700 });
}

async function getMasterKey(): Promise<Buffer> {
  try {
    const key = await readFile(MASTER_KEY_PATH);
    if (key.length === MASTER_KEY_BYTES) {
      return key;
    }
  } catch {
    // ignore
  }

  await ensureStorageDir();
  const key = randomBytes(MASTER_KEY_BYTES);
  await writeFile(MASTER_KEY_PATH, key, { mode: 0o600 });
  if (process.platform !== "win32") {
    await chmod(MASTER_KEY_PATH, 0o600);
  }
  return key;
}

function encryptData(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

function decryptData(data: Buffer, key: Buffer): string | null {
  if (data.length < IV_BYTES + TAG_BYTES) {
    return null;
  }
  try {
    const iv = data.subarray(0, IV_BYTES);
    const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const encrypted = data.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const encryptedFileBackend: KeychainBackend = {
  async get(_service, account) {
    try {
      const key = await getMasterKey();
      const data = await readFile(join(STORAGE_DIR, safeFileName(account)));
      return decryptData(data, key);
    } catch {
      return null;
    }
  },

  async set(_service, account, data) {
    const key = await getMasterKey();
    await ensureStorageDir();
    const filePath = join(STORAGE_DIR, safeFileName(account));
    const encrypted = encryptData(data, key);
    await writeFile(filePath, encrypted, { mode: 0o600 });
    if (process.platform !== "win32") {
      await chmod(filePath, 0o600);
    }
  },

  async remove(_service, account) {
    try {
      await unlink(join(STORAGE_DIR, safeFileName(account)));
    } catch {
      // no-op
    }
  },
};

const backend =
  process.platform === "darwin"
    ? darwinBackend
    : encryptedFileBackend;

export async function getStoredToken(
  appId: string,
  userOpenId: string,
): Promise<StoredUAToken | null> {
  try {
    const json = await backend.get(KEYCHAIN_SERVICE, accountKey(appId, userOpenId));
    return json ? (JSON.parse(json) as StoredUAToken) : null;
  } catch {
    return null;
  }
}

export async function setStoredToken(token: StoredUAToken): Promise<void> {
  const payload = JSON.stringify(token);
  await backend.set(KEYCHAIN_SERVICE, accountKey(token.appId, token.userOpenId), payload);
}

export async function removeStoredToken(appId: string, userOpenId: string): Promise<void> {
  await backend.remove(KEYCHAIN_SERVICE, accountKey(appId, userOpenId));
}

export function tokenStatus(token: StoredUAToken): "valid" | "needs_refresh" | "expired" {
  const now = Date.now();
  if (now < token.expiresAt - REFRESH_AHEAD_MS) {
    return "valid";
  }
  if (now < token.refreshExpiresAt) {
    return "needs_refresh";
  }
  return "expired";
}
