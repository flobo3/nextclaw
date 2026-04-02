import type { SkillsLoader } from "./skills.js";

function wrapSkillTag(tagName: string, manifest: string): string {
  return [`<${tagName}>`, manifest, `</${tagName}>`].join("\n");
}

function buildSelectedSkillsBlock(skills: SkillsLoader, skillSelectors: string[]): string {
  const manifest = skills.buildSkillsManifest(skillSelectors);
  if (!manifest) {
    return "";
  }
  return [
    "## Requested Skills",
    "The user explicitly selected the following skills for this turn.",
    "In user-visible chat text, tokens like `$weather` or `$web-search` are explicit skill-selection markers authored by the user.",
    "Skill refs are the authoritative identity. Skill names may repeat across project and workspace scopes.",
    "If you need a skill's instructions, read the corresponding SKILL.md from <location>.",
    "You MUST prioritize these selected skills in this turn unless higher-priority safety/system instructions conflict.",
    "",
    wrapSkillTag("requested_skills", manifest),
  ].join("\n\n");
}

export function buildRequestedSkillsSystemSection(skills: SkillsLoader, skillSelectors: string[]): string {
  const block = buildSelectedSkillsBlock(skills, skillSelectors);
  if (!block) {
    return "";
  }
  return block.replace("## Requested Skills", "# Requested Skills");
}

export function buildRequestedSkillsUserPrompt(
  skills: SkillsLoader,
  skillSelectors: string[],
  userMessage: string,
): string {
  const block = buildSelectedSkillsBlock(skills, skillSelectors);
  if (!block) {
    return userMessage;
  }
  return [block, "## User Message", userMessage].join("\n\n");
}

export function buildActiveSkillsSystemSection(skills: SkillsLoader, skillSelectors: string[]): string {
  const manifest = skills.buildSkillsManifest(skillSelectors);
  if (!manifest) {
    return "";
  }
  return [
    "# Active Skills",
    "These always-on skills are available for this session context.",
    "Skill refs are unique identities; names may repeat.",
    "Read a SKILL.md from <location> only when you need its instructions.",
    "",
    wrapSkillTag("active_skills", manifest),
  ].join("\n\n");
}

export function buildAvailableSkillsSystemSection(skills: SkillsLoader): string {
  const summary = skills.buildSkillsSummary();
  if (!summary) {
    return "";
  }
  return [
    "## Skills (mandatory)",
    "Before replying: scan <available_skills> entries.",
    "- If exactly one skill clearly applies: read its SKILL.md at <location> with `read_file`, then follow it.",
    "- If multiple skills share the same <name>, use <ref> to distinguish them. Never assume duplicate names mean the same skill.",
    "- If none clearly apply: do not read any SKILL.md.",
    "Constraints: never read more than one skill up front; only read after selecting.",
    "",
    "<available_skills>",
    summary,
    "</available_skills>",
  ].join("\n");
}
