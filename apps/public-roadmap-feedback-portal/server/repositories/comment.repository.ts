import type { CommentEntry, PortalTargetType } from "../../shared/public-roadmap-feedback-portal.types.js";
import type { D1Database } from "../portal-env.types.js";

type CommentRow = {
  id: string;
  target_type: string;
  target_id: string;
  author_label: string;
  body: string;
  created_at: string;
};

type CountRow = {
  total: number;
};

export class CommentRepository {
  readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  listComments = async (): Promise<CommentEntry[]> => {
    const result = await this.db.prepare(
      `SELECT
        id,
        target_type,
        target_id,
        author_label,
        body,
        created_at
      FROM comments
      ORDER BY created_at DESC`
    ).all<CommentRow>();
    return result.results.map(this.mapRowToComment);
  };

  createComment = async (comment: CommentEntry): Promise<void> => {
    await this.db.prepare(
      `INSERT INTO comments (
        id,
        target_type,
        target_id,
        author_label,
        body,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      comment.id,
      comment.targetType,
      comment.targetId,
      comment.authorLabel,
      comment.body,
      comment.createdAt
    ).run();
  };

  countComments = async (targetType: PortalTargetType, targetId: string): Promise<number> => {
    const row = await this.db.prepare(
      `SELECT COUNT(*) AS total
      FROM comments
      WHERE target_type = ? AND target_id = ?`
    ).bind(targetType, targetId).first<CountRow>();
    return row?.total ?? 0;
  };

  private mapRowToComment = (row: CommentRow): CommentEntry => {
    return {
      id: row.id,
      targetType: row.target_type as CommentEntry["targetType"],
      targetId: row.target_id,
      authorLabel: row.author_label,
      body: row.body,
      createdAt: row.created_at
    };
  };
}
