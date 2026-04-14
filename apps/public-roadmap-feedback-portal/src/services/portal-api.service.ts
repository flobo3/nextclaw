import type {
  ApiEnvelope,
  CreateCommentInput,
  CreateCommentResponse,
  CreateFeedbackInput,
  CreateFeedbackResponse,
  CreateVoteResponse,
  FeedbackQuery,
  FeedbackResponse,
  ItemsQuery,
  ItemsResponse,
  PortalOverview,
  PublicItemDetail,
  UpdatesResponse
} from "@shared/public-roadmap-feedback-portal.types";

export const portalQueryKeys = {
  overview: () => ["portal", "overview"] as const,
  items: (query: ItemsQuery) => ["portal", "items", query.view ?? "board", query.phase ?? "all", query.type ?? "all", query.sort ?? "recent"] as const,
  itemOptions: () => ["portal", "item-options"] as const,
  updates: () => ["portal", "updates"] as const,
  itemDetail: (itemId: string | null) => ["portal", "item-detail", itemId ?? "none"] as const,
  feedback: (query: FeedbackQuery) => ["portal", "feedback", query.status ?? "all", query.linkedItemId ?? "all", query.sort ?? "recent"] as const,
  all: () => ["portal"] as const
};

class PortalApiService {
  readonly baseUrl: string;

  constructor(baseUrl = (import.meta.env.VITE_PUBLIC_ROADMAP_FEEDBACK_PORTAL_API_BASE ?? "").replace(/\/+$/, "")) {
    this.baseUrl = baseUrl;
  }

  getOverview = async (): Promise<PortalOverview> => {
    return await this.fetchJson<PortalOverview>("/api/overview");
  };

  getItems = async (query: ItemsQuery): Promise<ItemsResponse> => {
    const params = new URLSearchParams();
    if (query.phase) {
      params.set("phase", query.phase);
    }
    if (query.type) {
      params.set("type", query.type);
    }
    if (query.sort) {
      params.set("sort", query.sort);
    }
    if (query.view) {
      params.set("view", query.view);
    }
    return await this.fetchJson<ItemsResponse>(`/api/items?${params.toString()}`);
  };

  getItemDetail = async (itemId: string): Promise<PublicItemDetail> => {
    return await this.fetchJson<PublicItemDetail>(`/api/items/${encodeURIComponent(itemId)}`);
  };

  getFeedback = async (query: FeedbackQuery): Promise<FeedbackResponse> => {
    const params = new URLSearchParams();
    if (query.status) {
      params.set("status", query.status);
    }
    if (query.linkedItemId) {
      params.set("linkedItemId", query.linkedItemId);
    }
    if (query.sort) {
      params.set("sort", query.sort);
    }
    return await this.fetchJson<FeedbackResponse>(`/api/feedback?${params.toString()}`);
  };

  createFeedback = async (input: CreateFeedbackInput): Promise<CreateFeedbackResponse> => {
    return await this.postJson<CreateFeedbackResponse>("/api/feedback", input);
  };

  createItemVote = async (itemId: string): Promise<CreateVoteResponse> => {
    return await this.postJson<CreateVoteResponse>(`/api/items/${encodeURIComponent(itemId)}/votes`);
  };

  createFeedbackVote = async (feedbackId: string): Promise<CreateVoteResponse> => {
    return await this.postJson<CreateVoteResponse>(`/api/feedback/${encodeURIComponent(feedbackId)}/votes`);
  };

  createItemComment = async (itemId: string, input: CreateCommentInput): Promise<CreateCommentResponse> => {
    return await this.postJson<CreateCommentResponse>(`/api/items/${encodeURIComponent(itemId)}/comments`, input);
  };

  createFeedbackComment = async (feedbackId: string, input: CreateCommentInput): Promise<CreateCommentResponse> => {
    return await this.postJson<CreateCommentResponse>(`/api/feedback/${encodeURIComponent(feedbackId)}/comments`, input);
  };

  getUpdates = async (): Promise<UpdatesResponse> => {
    return await this.fetchJson<UpdatesResponse>("/api/updates");
  };

  private fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(this.createUrl(path), init);
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || !payload.ok) {
      const message = payload.ok ? `Request failed: ${path}` : payload.error.message;
      throw new Error(message);
    }
    return payload.data;
  };

  private postJson = async <T>(path: string, body?: unknown): Promise<T> => {
    return await this.fetchJson<T>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
  };

  private createUrl = (path: string): string => {
    return this.baseUrl ? `${this.baseUrl}${path}` : path;
  };
}

export const portalApiService = new PortalApiService();
