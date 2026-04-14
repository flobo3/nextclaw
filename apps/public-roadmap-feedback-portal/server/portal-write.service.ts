import type {
  CommentEntry,
  CreateCommentInput,
  CreateFeedbackInput,
  PortalDataMode,
  PortalTargetType,
  PublicItem
} from "../shared/public-roadmap-feedback-portal.types.js";
import type { StoredFeedbackEntry, StoredVoteEntry } from "./community/portal-community.types.js";
import { PortalRequestError } from "./portal-request-error.utils.js";

type PortalWriteServiceParams = {
  mode: PortalDataMode;
  getItem: (itemId: string) => Promise<PublicItem | null>;
  getFeedbackEntry: (feedbackId: string) => Promise<StoredFeedbackEntry | null>;
  createFeedbackEntry: (entry: StoredFeedbackEntry) => Promise<void>;
  createComment: (comment: CommentEntry) => Promise<void>;
  countComments: (targetType: PortalTargetType, targetId: string) => Promise<number>;
  createVote: (vote: StoredVoteEntry) => Promise<void>;
  countVotes: (targetType: PortalTargetType, targetId: string) => Promise<number>;
};

const DEFAULT_AUTHOR_LABEL = "匿名用户";

export class PortalWriteService {
  readonly mode: PortalDataMode;
  readonly getItem: PortalWriteServiceParams["getItem"];
  readonly getFeedbackEntry: PortalWriteServiceParams["getFeedbackEntry"];
  readonly createFeedbackEntry: PortalWriteServiceParams["createFeedbackEntry"];
  readonly createCommentRecord: PortalWriteServiceParams["createComment"];
  readonly countComments: PortalWriteServiceParams["countComments"];
  readonly createVoteRecord: PortalWriteServiceParams["createVote"];
  readonly countVotes: PortalWriteServiceParams["countVotes"];

  constructor(params: PortalWriteServiceParams) {
    const {
      mode,
      getItem,
      getFeedbackEntry,
      createFeedbackEntry,
      createComment,
      countComments,
      createVote,
      countVotes
    } = params;
    this.mode = mode;
    this.getItem = getItem;
    this.getFeedbackEntry = getFeedbackEntry;
    this.createFeedbackEntry = createFeedbackEntry;
    this.createCommentRecord = createComment;
    this.countComments = countComments;
    this.createVoteRecord = createVote;
    this.countVotes = countVotes;
  }

  createFeedback = async (input: CreateFeedbackInput): Promise<StoredFeedbackEntry> => {
    const title = this.requireText(input.title, "FEEDBACK_TITLE_REQUIRED", "反馈标题不能为空。", 100);
    const description = this.requireText(
      input.description,
      "FEEDBACK_DESCRIPTION_REQUIRED",
      "反馈描述不能为空。",
      2000
    );
    const authorLabel = this.normalizeAuthorLabel(input.authorLabel);
    const linkedItemId = input.linkedItemId?.trim() ? input.linkedItemId.trim() : null;

    if (linkedItemId) {
      await this.assertTargetExists("item", linkedItemId);
    }

    const now = new Date().toISOString();
    const entry: StoredFeedbackEntry = {
      id: crypto.randomUUID(),
      slug: `${this.slugify(title)}-${crypto.randomUUID().slice(0, 8)}`,
      title,
      description,
      category: input.category,
      status: "open",
      authorLabel,
      tags: linkedItemId ? ["community", "linked-item"] : ["community"],
      createdAt: now,
      updatedAt: now,
      linkedItemId,
      seedVoteCount: 0,
      seedCommentCount: 0
    };

    await this.createFeedbackEntry(entry);
    return entry;
  };

  createVote = async (targetType: PortalTargetType, targetId: string): Promise<number> => {
    const normalizedTargetId = targetId.trim();
    await this.assertTargetExists(targetType, normalizedTargetId);

    await this.createVoteRecord({
      id: crypto.randomUUID(),
      targetType,
      targetId: normalizedTargetId,
      createdAt: new Date().toISOString()
    });

    return await this.countVotes(targetType, normalizedTargetId);
  };

  createComment = async (
    targetType: PortalTargetType,
    targetId: string,
    input: CreateCommentInput
  ): Promise<{
    comment: CommentEntry;
    commentCount: number;
  }> => {
    const normalizedTargetId = targetId.trim();
    await this.assertTargetExists(targetType, normalizedTargetId);

    const comment: CommentEntry = {
      id: crypto.randomUUID(),
      targetType,
      targetId: normalizedTargetId,
      body: this.requireText(input.body, "COMMENT_BODY_REQUIRED", "评论内容不能为空。", 1200),
      authorLabel: this.normalizeAuthorLabel(input.authorLabel),
      createdAt: new Date().toISOString()
    };

    await this.createCommentRecord(comment);

    return {
      comment,
      commentCount: await this.countComments(targetType, normalizedTargetId)
    };
  };

  private assertTargetExists = async (targetType: PortalTargetType, targetId: string): Promise<void> => {
    if (targetType === "item") {
      const item = await this.getItem(targetId);
      if (!item) {
        throw new PortalRequestError(404, "ITEM_NOT_FOUND", `Unknown public roadmap item: ${targetId}`);
      }
      return;
    }

    const feedback = await this.getFeedbackEntry(targetId);
    if (!feedback) {
      throw new PortalRequestError(404, "FEEDBACK_NOT_FOUND", `Unknown feedback entry: ${targetId}`);
    }
  };

  private requireText = (value: string | undefined, code: string, message: string, maxLength: number): string => {
    const normalized = `${value ?? ""}`.trim();
    if (!normalized) {
      throw new PortalRequestError(400, code, message);
    }
    if (normalized.length > maxLength) {
      throw new PortalRequestError(400, code, `输入长度不能超过 ${maxLength} 个字符。`);
    }
    return normalized;
  };

  private normalizeAuthorLabel = (value: string | undefined): string => {
    const normalized = `${value ?? ""}`.trim();
    return normalized ? normalized.slice(0, 40) : DEFAULT_AUTHOR_LABEL;
  };

  private slugify = (value: string): string => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "feedback";
  };
}
