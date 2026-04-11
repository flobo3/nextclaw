function normalizeVersionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split("-", 1)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) && part >= 0 ? part : 0));
}

export function compareDesktopVersions(left: string, right: string): number {
  const leftParts = normalizeVersionParts(left);
  const rightParts = normalizeVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }
  return 0;
}
