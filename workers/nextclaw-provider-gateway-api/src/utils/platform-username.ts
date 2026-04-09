const RESERVED_PLATFORM_USERNAMES = new Set([
  "nextclaw",
  "admin",
  "official",
  "support",
  "root",
]);

export function normalizePlatformUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validatePlatformUsername(value: string): string | null {
  const normalized = normalizePlatformUsername(value);
  if (!normalized) {
    return "Username is required.";
  }
  if (normalized.length < 3 || normalized.length > 32) {
    return "Username must be between 3 and 32 characters.";
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
    return "Username may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.";
  }
  if (RESERVED_PLATFORM_USERNAMES.has(normalized)) {
    return "This username is reserved.";
  }
  return null;
}
