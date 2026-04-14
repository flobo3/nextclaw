import type { PublicItem, PublicItemSource } from "../../shared/public-roadmap-feedback-portal.types.js";
import type { D1Database } from "../portal-env.types.js";

type PublicItemRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  public_phase: string;
  item_type: string;
  source: string;
  is_official: number;
  tags_json: string;
  updated_at: string;
  shipped_at: string | null;
  vote_count: number;
  comment_count: number;
  linked_feedback_count: number;
  source_metadata_json: string;
};

export class PublicItemRepository {
  readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  listItems = async (): Promise<PublicItem[]> => {
    const result = await this.db.prepare(
      `SELECT
        id,
        slug,
        title,
        summary,
        description,
        public_phase,
        item_type,
        source,
        is_official,
        tags_json,
        updated_at,
        shipped_at,
        vote_count,
        comment_count,
        linked_feedback_count,
        source_metadata_json
      FROM public_items
      ORDER BY updated_at DESC`
    ).all<PublicItemRow>();
    return result.results.map(this.mapRowToPublicItem);
  };

  getItem = async (itemId: string): Promise<PublicItem | null> => {
    const row = await this.db.prepare(
      `SELECT
        id,
        slug,
        title,
        summary,
        description,
        public_phase,
        item_type,
        source,
        is_official,
        tags_json,
        updated_at,
        shipped_at,
        vote_count,
        comment_count,
        linked_feedback_count,
        source_metadata_json
      FROM public_items
      WHERE id = ? OR slug = ?
      LIMIT 1`
    ).bind(itemId, itemId).first<PublicItemRow>();
    return row ? this.mapRowToPublicItem(row) : null;
  };

  replaceSourceItems = async (source: PublicItemSource, items: PublicItem[]): Promise<void> => {
    await this.db.prepare("DELETE FROM public_items WHERE source = ?").bind(source).run();

    if (items.length === 0) {
      return;
    }

    const statements = items.map((item) => this.db.prepare(
      `INSERT INTO public_items (
        id,
        slug,
        title,
        summary,
        description,
        public_phase,
        item_type,
        source,
        is_official,
        tags_json,
        updated_at,
        shipped_at,
        vote_count,
        comment_count,
        linked_feedback_count,
        source_metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      item.id,
      item.slug,
      item.title,
      item.summary,
      item.description,
      item.publicPhase,
      item.type,
      item.source,
      item.isOfficial ? 1 : 0,
      JSON.stringify(item.tags),
      item.updatedAt,
      item.shippedAt,
      item.engagement.voteCount,
      item.engagement.commentCount,
      item.engagement.linkedFeedbackCount,
      JSON.stringify(item.sourceMetadata)
    ));

    if (this.db.batch) {
      await this.db.batch(statements);
      return;
    }

    for (const statement of statements) {
      await statement.run();
    }
  };

  private mapRowToPublicItem = (row: PublicItemRow): PublicItem => {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      description: row.description,
      publicPhase: row.public_phase as PublicItem["publicPhase"],
      type: row.item_type as PublicItem["type"],
      source: row.source as PublicItem["source"],
      isOfficial: row.is_official === 1,
      tags: JSON.parse(row.tags_json) as string[],
      updatedAt: row.updated_at,
      shippedAt: row.shipped_at,
      engagement: {
        voteCount: row.vote_count,
        commentCount: row.comment_count,
        linkedFeedbackCount: row.linked_feedback_count
      },
      sourceMetadata: JSON.parse(row.source_metadata_json) as PublicItem["sourceMetadata"]
    };
  };
}
