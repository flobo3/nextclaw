import type { D1Database } from "../portal-env.types.js";
import type { StoredFeedbackEntry } from "../community/portal-community.types.js";

type FeedbackEntryRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  feedback_status: string;
  author_label: string;
  tags_json: string;
  linked_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export class FeedbackEntryRepository {
  readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  listFeedbackEntries = async (): Promise<StoredFeedbackEntry[]> => {
    const result = await this.db.prepare(
      `SELECT
        id,
        slug,
        title,
        description,
        category,
        feedback_status,
        author_label,
        tags_json,
        linked_item_id,
        created_at,
        updated_at
      FROM feedback_entries
      ORDER BY updated_at DESC`
    ).all<FeedbackEntryRow>();
    return result.results.map(this.mapRowToFeedbackEntry);
  };

  getFeedbackEntry = async (feedbackId: string): Promise<StoredFeedbackEntry | null> => {
    const row = await this.db.prepare(
      `SELECT
        id,
        slug,
        title,
        description,
        category,
        feedback_status,
        author_label,
        tags_json,
        linked_item_id,
        created_at,
        updated_at
      FROM feedback_entries
      WHERE id = ? OR slug = ?
      LIMIT 1`
    ).bind(feedbackId, feedbackId).first<FeedbackEntryRow>();
    return row ? this.mapRowToFeedbackEntry(row) : null;
  };

  createFeedbackEntry = async (entry: StoredFeedbackEntry): Promise<void> => {
    await this.db.prepare(
      `INSERT INTO feedback_entries (
        id,
        slug,
        title,
        description,
        category,
        feedback_status,
        author_label,
        tags_json,
        linked_item_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      entry.id,
      entry.slug,
      entry.title,
      entry.description,
      entry.category,
      entry.status,
      entry.authorLabel,
      JSON.stringify(entry.tags),
      entry.linkedItemId,
      entry.createdAt,
      entry.updatedAt
    ).run();
  };

  private mapRowToFeedbackEntry = (row: FeedbackEntryRow): StoredFeedbackEntry => {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      category: row.category as StoredFeedbackEntry["category"],
      status: row.feedback_status as StoredFeedbackEntry["status"],
      authorLabel: row.author_label,
      tags: JSON.parse(row.tags_json) as string[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      linkedItemId: row.linked_item_id,
      seedVoteCount: 0,
      seedCommentCount: 0
    };
  };
}
