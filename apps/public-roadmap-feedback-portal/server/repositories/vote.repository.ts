import type { PortalTargetType } from "../../shared/public-roadmap-feedback-portal.types.js";
import type { StoredVoteEntry } from "../community/portal-community.types.js";
import type { D1Database } from "../portal-env.types.js";

type VoteRow = {
  id: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

type CountRow = {
  total: number;
};

export class VoteRepository {
  readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  listVotes = async (): Promise<StoredVoteEntry[]> => {
    const result = await this.db.prepare(
      `SELECT
        id,
        target_type,
        target_id,
        created_at
      FROM votes
      ORDER BY created_at DESC`
    ).all<VoteRow>();
    return result.results.map(this.mapRowToVote);
  };

  createVote = async (vote: StoredVoteEntry): Promise<void> => {
    await this.db.prepare(
      `INSERT INTO votes (
        id,
        target_type,
        target_id,
        created_at
      ) VALUES (?, ?, ?, ?)`
    ).bind(vote.id, vote.targetType, vote.targetId, vote.createdAt).run();
  };

  countVotes = async (targetType: PortalTargetType, targetId: string): Promise<number> => {
    const row = await this.db.prepare(
      `SELECT COUNT(*) AS total
      FROM votes
      WHERE target_type = ? AND target_id = ?`
    ).bind(targetType, targetId).first<CountRow>();
    return row?.total ?? 0;
  };

  private mapRowToVote = (row: VoteRow): StoredVoteEntry => {
    return {
      id: row.id,
      targetType: row.target_type as StoredVoteEntry["targetType"],
      targetId: row.target_id,
      createdAt: row.created_at
    };
  };
}
