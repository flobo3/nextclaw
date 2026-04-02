import { SkillsLoader } from "../agent/skills.js";

export class LayeredSkillsLoader extends SkillsLoader {
  constructor(
    workspace: string,
    supportingWorkspaces: string[] = [],
  ) {
    super({
      workspace,
      supportingWorkspaces,
    });
  }
}
