import type { SkillInfo } from "../agent/skills.js";
import { SkillsLoader } from "../agent/skills.js";

export class LayeredSkillsLoader extends SkillsLoader {
  private readonly supportingLoaders: SkillsLoader[];

  constructor(
    workspace: string,
    supportingWorkspaces: string[] = [],
  ) {
    super(workspace);
    this.supportingLoaders = dedupeWorkspacePaths(supportingWorkspaces, workspace).map(
      (supportingWorkspace) => new SkillsLoader(supportingWorkspace),
    );
  }

  override listSkills = (filterUnavailable = true): SkillInfo[] => {
    const skills = [...super.listSkills(filterUnavailable)];
    const seenNames = new Set(skills.map((skill) => skill.name));

    for (const loader of this.supportingLoaders) {
      for (const skill of loader.listSkills(filterUnavailable)) {
        if (seenNames.has(skill.name)) {
          continue;
        }
        seenNames.add(skill.name);
        skills.push(skill);
      }
    }

    return skills;
  };

  override loadSkill = (name: string): string | null => {
    return super.loadSkill(name) ?? this.findSupportingResult((loader) => loader.loadSkill(name));
  };

  override getSkillInfo = (name: string): SkillInfo | null => {
    return super.getSkillInfo(name) ?? this.findSupportingResult((loader) => loader.getSkillInfo(name));
  };

  private findSupportingResult = <T>(
    read: (loader: SkillsLoader) => T | null,
  ): T | null => {
    for (const loader of this.supportingLoaders) {
      const result = read(loader);
      if (result) {
        return result;
      }
    }
    return null;
  };
}

function dedupeWorkspacePaths(values: string[], primaryWorkspace: string): string[] {
  const seen = new Set<string>([primaryWorkspace]);
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}
