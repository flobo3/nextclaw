import type { PublicItemType } from "../shared/public-roadmap-feedback-portal.types.js";
import type { PortalWorkerEnv } from "./portal-env.types.js";

const DEFAULT_LINEAR_API_URL = "https://api.linear.app/graphql";

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  const values = `${value ?? ""}`
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
}

export class PortalConfigService {
  readonly env: PortalWorkerEnv;

  constructor(env: PortalWorkerEnv = {}) {
    this.env = env;
  }

  getDataMode = (): "preview" | "live" => {
    return this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_DATA_MODE === "live" ? "live" : "preview";
  };

  getInternalToken = (): string | null => {
    const token = this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_INTERNAL_TOKEN?.trim() ?? "";
    return token.length > 0 ? token : null;
  };

  getLinearApiUrl = (): string => {
    const value = this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_API_URL?.trim() ?? "";
    return value || DEFAULT_LINEAR_API_URL;
  };

  getLinearAuthorizationHeader = (): string => {
    const token = this.getLinearApiToken();
    const mode = this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_AUTH_MODE?.trim() || "personal-key";
    if (mode === "oauth-bearer") {
      return `Bearer ${token}`;
    }
    if (mode === "personal-key") {
      return token;
    }
    throw new Error("PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_AUTH_MODE must be 'personal-key' or 'oauth-bearer'.");
  };

  getLinearApiToken = (): string => {
    const value = this.env.LINEAR_API_TOKEN?.trim() ?? "";
    if (!value) {
      throw new Error("LINEAR_API_TOKEN is required in live mode.");
    }
    return value;
  };

  getLinearTeamKey = (): string => {
    const value = this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_TEAM_KEY?.trim() ?? "";
    if (!value) {
      throw new Error("PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_TEAM_KEY is required in live mode.");
    }
    return value;
  };

  getLinearPublicLabels = (): string[] => {
    return parseCsv(this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_PUBLIC_LABELS, ["public"]);
  };

  getLinearTypeMatchers = (): Record<PublicItemType, string[]> => {
    return {
      feature: parseCsv(this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_FEATURE_LABELS, ["feature"]),
      bug: parseCsv(this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_BUG_LABELS, ["bug"]),
      improvement: parseCsv(this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_IMPROVEMENT_LABELS, ["improvement"]),
      research: parseCsv(this.env.PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_RESEARCH_LABELS, ["research"])
    };
  };
}
