import type {
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
} from "../shared/public-roadmap-feedback-portal.types.js";
import { PortalConfigService } from "./portal-config.service.js";
import type { PortalWorkerEnv } from "./portal-env.types.js";
import { PortalQueryService } from "./portal-query.service.js";
import { PortalWriteService } from "./portal-write.service.js";
import { LinearSourceProvider } from "./providers/linear-source.provider.js";
import { getPortalPreviewStateService } from "./preview/portal-preview-state.service.js";
import { PortalSyncManager } from "./portal-sync.manager.js";
import { CommentRepository } from "./repositories/comment.repository.js";
import { FeedbackEntryRepository } from "./repositories/feedback-entry.repository.js";
import { PublicItemRepository } from "./repositories/public-item.repository.js";
import { PortalSourceLinkRepository } from "./repositories/portal-source-link.repository.js";
import { VoteRepository } from "./repositories/vote.repository.js";

export class PortalRuntimeService {
  readonly env: PortalWorkerEnv;
  readonly configService: PortalConfigService;

  constructor(env: PortalWorkerEnv = {}) {
    this.env = env;
    this.configService = new PortalConfigService(env);
  }

  getOverview = async (): Promise<PortalOverview> => {
    return (await this.createQueryService()).getOverview();
  };

  listItems = async (query: ItemsQuery): Promise<ItemsResponse> => {
    return (await this.createQueryService()).listItems(query);
  };

  getItemDetail = async (itemId: string): Promise<PublicItemDetail> => {
    return (await this.createQueryService()).getItemDetail(itemId);
  };

  getUpdates = async (): Promise<UpdatesResponse> => {
    return (await this.createQueryService()).getUpdates();
  };

  listFeedback = async (query: FeedbackQuery): Promise<FeedbackResponse> => {
    return (await this.createQueryService()).listFeedback(query);
  };

  createFeedback = async (input: CreateFeedbackInput): Promise<CreateFeedbackResponse> => {
    const created = await this.createWriteService().createFeedback(input);
    return {
      mode: this.configService.getDataMode(),
      item: (await this.createQueryService()).getFeedbackThread(created.id)
    };
  };

  createVote = async (
    targetType: CreateVoteResponse["targetType"],
    targetId: string
  ): Promise<CreateVoteResponse> => {
    const voteCount = await this.createWriteService().createVote(targetType, targetId);
    return {
      mode: this.configService.getDataMode(),
      targetType,
      targetId,
      voteCount
    };
  };

  createComment = async (
    targetType: CreateVoteResponse["targetType"],
    targetId: string,
    input: CreateCommentInput
  ): Promise<CreateCommentResponse> => {
    const result = await this.createWriteService().createComment(targetType, targetId, input);
    return {
      mode: this.configService.getDataMode(),
      comment: result.comment,
      commentCount: result.commentCount
    };
  };

  syncLinearRoadmap = async (): Promise<{
    syncedCount: number;
    syncedAt: string;
  }> => {
    const db = this.assertLiveDatabase();
    const syncManager = new PortalSyncManager({
      linearSourceAdapter: new LinearSourceProvider(this.configService),
      publicItemRepository: new PublicItemRepository(db),
      portalSourceLinkRepository: new PortalSourceLinkRepository(db)
    });
    return await syncManager.syncLinearRoadmap();
  };

  assertInternalToken = (authHeader: string | null): void => {
    const expectedToken = this.configService.getInternalToken();
    if (!expectedToken) {
      throw new Error("PUBLIC_ROADMAP_FEEDBACK_PORTAL_INTERNAL_TOKEN is required for sync.");
    }
    const token = `${authHeader ?? ""}`.replace(/^Bearer\s+/i, "").trim();
    if (token !== expectedToken) {
      throw new Error("Invalid internal sync token.");
    }
  };

  private createQueryService = async (): Promise<PortalQueryService> => {
    if (this.configService.getDataMode() === "preview") {
      const previewStateService = getPortalPreviewStateService();
      return new PortalQueryService({
        mode: "preview",
        items: previewStateService.listItems(),
        feedbackEntries: previewStateService.listFeedbackEntries(),
        comments: previewStateService.listComments(),
        votes: previewStateService.listVotes()
      });
    }

    const db = this.assertLiveDatabase();
    const publicItemRepository = new PublicItemRepository(db);
    const feedbackEntryRepository = new FeedbackEntryRepository(db);
    const commentRepository = new CommentRepository(db);
    const voteRepository = new VoteRepository(db);

    return new PortalQueryService({
      mode: "live",
      items: await publicItemRepository.listItems(),
      feedbackEntries: await feedbackEntryRepository.listFeedbackEntries(),
      comments: await commentRepository.listComments(),
      votes: await voteRepository.listVotes()
    });
  };

  private createWriteService = (): PortalWriteService => {
    if (this.configService.getDataMode() === "preview") {
      const previewStateService = getPortalPreviewStateService();
      return new PortalWriteService({
        mode: "preview",
        getItem: previewStateService.getItem,
        getFeedbackEntry: previewStateService.getFeedbackEntry,
        createFeedbackEntry: previewStateService.createFeedbackEntry,
        createComment: previewStateService.createComment,
        countComments: previewStateService.countComments,
        createVote: previewStateService.createVote,
        countVotes: previewStateService.countVotes
      });
    }

    const db = this.assertLiveDatabase();
    const publicItemRepository = new PublicItemRepository(db);
    const feedbackEntryRepository = new FeedbackEntryRepository(db);
    const commentRepository = new CommentRepository(db);
    const voteRepository = new VoteRepository(db);

    return new PortalWriteService({
      mode: "live",
      getItem: publicItemRepository.getItem,
      getFeedbackEntry: feedbackEntryRepository.getFeedbackEntry,
      createFeedbackEntry: feedbackEntryRepository.createFeedbackEntry,
      createComment: commentRepository.createComment,
      countComments: commentRepository.countComments,
      createVote: voteRepository.createVote,
      countVotes: voteRepository.countVotes
    });
  };

  private assertLiveDatabase = () => {
    if (this.configService.getDataMode() !== "live") {
      throw new Error("Live database access requires PUBLIC_ROADMAP_FEEDBACK_PORTAL_DATA_MODE=live.");
    }
    if (!this.env.PUBLIC_ROADMAP_PORTAL_DB) {
      throw new Error("PUBLIC_ROADMAP_PORTAL_DB binding is required in live mode.");
    }
    return this.env.PUBLIC_ROADMAP_PORTAL_DB;
  };
}
