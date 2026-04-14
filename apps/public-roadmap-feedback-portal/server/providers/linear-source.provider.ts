import type { PublicItem, PublicItemType } from "../../shared/public-roadmap-feedback-portal.types.js";
import type { PortalConfigService } from "../portal-config.service.js";
import type { PortalSourceLinkRecord } from "../portal-source-link.types.js";
import type { SyncedPortalItem } from "../portal-sync.types.js";

type LinearIssueNode = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  updatedAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  url: string | null;
  state: {
    name: string | null;
  } | null;
  labels: {
    nodes: Array<{
      name: string;
    }>;
  };
};

type LinearIssuesConnection = {
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  nodes: LinearIssueNode[];
};

type LinearTeamNode = {
  id: string;
  name: string;
  key: string;
};

type LinearGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
  }>;
};

const LINEAR_TEAM_QUERY = `
query PublicRoadmapTeam($teamKey: String!) {
  teams(filter: { key: { eq: $teamKey } }) {
    nodes {
      id
      name
      key
    }
  }
}
`;

const LINEAR_ISSUES_PAGE_QUERY = `
query PublicRoadmapIssuesPage($teamKey: String!, $after: String) {
  issues(
    first: 50,
    after: $after,
    filter: { team: { key: { eq: $teamKey } } },
    orderBy: updatedAt
  ) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      identifier
      title
      description
      updatedAt
      completedAt
      canceledAt
      url
      state {
        name
      }
      labels {
        nodes {
          name
        }
      }
    }
  }
}
`;

export class LinearSourceProvider {
  readonly configService: PortalConfigService;

  constructor(configService: PortalConfigService) {
    this.configService = configService;
  }

  listPublicItems = async (): Promise<SyncedPortalItem[]> => {
    const team = await this.getTeam();
    if (!team) {
      return [];
    }

    const issues = await this.listTeamIssues();
    return issues
      .filter((issue) => this.isPublicIssue(issue))
      .map((issue) => this.mapIssueToSyncedItem(issue, team));
  };

  private getTeam = async (): Promise<LinearTeamNode | null> => {
    const payload = await this.executeGraphql<{
      teams?: {
        nodes: LinearTeamNode[];
      };
    }>(LINEAR_TEAM_QUERY, {
      teamKey: this.configService.getLinearTeamKey()
    });
    return payload.teams?.nodes?.[0] ?? null;
  };

  private listTeamIssues = async (): Promise<LinearIssueNode[]> => {
    const issues: LinearIssueNode[] = [];
    let afterCursor: string | null = null;

    do {
      const payload: {
        issues: LinearIssuesConnection;
      } = await this.executeGraphql<{
        issues: LinearIssuesConnection;
      }>(LINEAR_ISSUES_PAGE_QUERY, {
        teamKey: this.configService.getLinearTeamKey(),
        after: afterCursor
      });
      issues.push(...payload.issues.nodes);
      afterCursor = payload.issues.pageInfo.hasNextPage
        ? payload.issues.pageInfo.endCursor
        : null;
    } while (afterCursor);

    return issues;
  };

  private executeGraphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const response = await fetch(this.configService.getLinearApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: this.configService.getLinearAuthorizationHeader()
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const payload = await response.json() as LinearGraphqlResponse<T>;
    if (!response.ok || payload.errors?.length || !payload.data) {
      const message = payload.errors?.map((entry) => entry.message).join("; ")
        || `Linear request failed with status ${response.status}.`;
      throw new Error(message);
    }

    return payload.data;
  };

  private isPublicIssue = (issue: LinearIssueNode): boolean => {
    if (this.configService.shouldSyncAllLinearIssues()) {
      return true;
    }
    const labels = issue.labels.nodes.map((entry) => entry.name.trim().toLowerCase());
    return this.configService.getLinearPublicLabels().some((label) => labels.includes(label));
  };

  private mapIssueToSyncedItem = (issue: LinearIssueNode, team: LinearTeamNode): SyncedPortalItem => {
    const labelNames = issue.labels.nodes.map((entry) => entry.name.trim());
    const sourceStatus = issue.state?.name?.trim() || "Unknown";
    const nowIso = new Date().toISOString();
    const publicItem: PublicItem = {
      id: `linear-${issue.id}`,
      slug: this.createSlug(issue.identifier, issue.title),
      title: issue.title.trim(),
      summary: this.buildSummary(issue.description, sourceStatus),
      description: issue.description?.trim() || issue.title.trim(),
      publicPhase: this.mapSourceStatusToPublicPhase(sourceStatus),
      type: this.resolveItemType(labelNames),
      source: "linear",
      isOfficial: true,
      tags: labelNames.map((entry) => entry.toLowerCase()),
      updatedAt: issue.updatedAt,
      shippedAt: issue.completedAt,
      engagement: {
        voteCount: 0,
        commentCount: 0,
        linkedFeedbackCount: 0
      },
      sourceMetadata: {
        provider: "linear",
        sourceLabel: issue.identifier,
        sourceStatus,
        sourceUrl: issue.url,
        teamName: team.name,
        labelNames
      }
    };

    const sourceLink: PortalSourceLinkRecord = {
      itemId: publicItem.id,
      provider: "linear",
      providerObjectId: issue.id,
      providerUrl: issue.url,
      sourceStatus,
      sourceType: publicItem.type,
      teamKey: team.key,
      rawPayloadJson: JSON.stringify(issue),
      lastSyncedAt: nowIso
    };

    return {
      item: publicItem,
      sourceLink
    };
  };

  private createSlug = (identifier: string, title: string): string => {
    const slugTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${identifier.toLowerCase()}-${slugTitle}`.slice(0, 96);
  };

  private buildSummary = (description: string | null, sourceStatus: string): string => {
    const compact = `${description ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
    if (compact) {
      return compact.slice(0, 180);
    }
    return `Synced from Linear · current source status: ${sourceStatus}`;
  };

  private mapSourceStatusToPublicPhase = (sourceStatus: string): PublicItem["publicPhase"] => {
    const normalized = sourceStatus.trim().toLowerCase();
    if (normalized === "backlog") {
      return "considering";
    }
    if (normalized === "todo") {
      return "planned";
    }
    if (normalized === "in progress") {
      return "building";
    }
    if (normalized === "in review") {
      return "reviewing";
    }
    if (normalized === "done") {
      return "shipped";
    }
    if (normalized === "canceled") {
      return "closed";
    }
    return "planned";
  };

  private resolveItemType = (labelNames: string[]): PublicItemType => {
    const normalizedLabels = labelNames.map((entry) => entry.trim().toLowerCase());
    const typeMatchers = this.configService.getLinearTypeMatchers();
    const orderedTypes: PublicItemType[] = ["bug", "research", "improvement", "feature"];

    for (const type of orderedTypes) {
      if (typeMatchers[type].some((label) => normalizedLabels.includes(label))) {
        return type;
      }
    }

    return "feature";
  };
}
