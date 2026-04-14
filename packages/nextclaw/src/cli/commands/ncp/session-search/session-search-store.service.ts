import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  SessionSearchDocument,
  SessionSearchStoreHit,
  SessionSearchStoreQuery,
  SessionSearchStoreResult,
} from "./session-search.types.js";

const SESSION_SEARCH_TABLE = "session_search_index";

type CountRow = {
  total?: number;
};

type SearchRow = {
  sessionId?: string;
  label?: string;
  content?: string;
  updatedAt?: string;
  rank?: number;
};

export class SessionSearchStoreService {
  private database: DatabaseSync | null = null;

  constructor(private readonly databasePath: string) {}

  initialize = async (): Promise<void> => {
    if (this.database) {
      return;
    }

    mkdirSync(dirname(this.databasePath), { recursive: true });
    this.database = new DatabaseSync(this.databasePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE VIRTUAL TABLE IF NOT EXISTS ${SESSION_SEARCH_TABLE}
      USING fts5(
        session_id UNINDEXED,
        label,
        content,
        updated_at UNINDEXED,
        tokenize = 'unicode61'
      );
    `);
  };

  listIndexedSessionIds = async (): Promise<string[]> => {
    const database = this.requireDatabase();
    const statement = database.prepare(`
      SELECT session_id AS sessionId
      FROM ${SESSION_SEARCH_TABLE}
    `);
    const rows = statement.all() as Array<{ sessionId?: string }>;
    return rows
      .map((row) => (typeof row.sessionId === "string" ? row.sessionId : ""))
      .filter((sessionId) => sessionId.length > 0);
  };

  upsertDocument = async (document: SessionSearchDocument): Promise<void> => {
    const database = this.requireDatabase();
    this.withTransaction(() => {
      database.prepare(`
        DELETE FROM ${SESSION_SEARCH_TABLE}
        WHERE session_id = ?
      `).run(document.sessionId);
      database.prepare(`
        INSERT INTO ${SESSION_SEARCH_TABLE} (session_id, label, content, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(document.sessionId, document.label, document.content, document.updatedAt);
    });
  };

  deleteDocument = async (sessionId: string): Promise<void> => {
    const database = this.requireDatabase();
    database.prepare(`
      DELETE FROM ${SESSION_SEARCH_TABLE}
      WHERE session_id = ?
    `).run(sessionId);
  };

  searchDocuments = async (query: SessionSearchStoreQuery): Promise<SessionSearchStoreResult> => {
    const database = this.requireDatabase();
    const countSql = this.buildSearchSql({
      includeLimit: false,
      excludeSessionId: Boolean(query.excludeSessionId),
    });
    const searchSql = this.buildSearchSql({
      includeLimit: true,
      excludeSessionId: Boolean(query.excludeSessionId),
    });

    const sharedParams = query.excludeSessionId
      ? [query.matchExpression, query.excludeSessionId]
      : [query.matchExpression];
    const countRow = database.prepare(countSql).get(...sharedParams) as CountRow | undefined;
    const rows = database
      .prepare(searchSql)
      .all(...sharedParams, query.limit) as SearchRow[];

    return {
      total: typeof countRow?.total === "number" ? countRow.total : 0,
      hits: rows.map((row): SessionSearchStoreHit => ({
        sessionId: typeof row.sessionId === "string" ? row.sessionId : "",
        label: typeof row.label === "string" ? row.label : "",
        content: typeof row.content === "string" ? row.content : "",
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
        rank: typeof row.rank === "number" ? row.rank : 0,
      })),
    };
  };

  close = async (): Promise<void> => {
    this.database?.close();
    this.database = null;
  };

  private buildSearchSql(params: {
    includeLimit: boolean;
    excludeSessionId: boolean;
  }): string {
    const extraFilter = params.excludeSessionId ? "AND session_id <> ?" : "";
    if (!params.includeLimit) {
      return `
        SELECT COUNT(*) AS total
        FROM ${SESSION_SEARCH_TABLE}
        WHERE ${SESSION_SEARCH_TABLE} MATCH ?
        ${extraFilter}
      `;
    }

    return `
      SELECT
        session_id AS sessionId,
        label,
        content,
        updated_at AS updatedAt,
        bm25(${SESSION_SEARCH_TABLE}) AS rank
      FROM ${SESSION_SEARCH_TABLE}
      WHERE ${SESSION_SEARCH_TABLE} MATCH ?
      ${extraFilter}
      ORDER BY rank, updated_at DESC
      LIMIT ?
    `;
  }

  private withTransaction(work: () => void): void {
    const database = this.requireDatabase();
    database.exec("BEGIN IMMEDIATE");
    try {
      work();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  private requireDatabase(): DatabaseSync {
    if (!this.database) {
      throw new Error("Session search store has not been initialized.");
    }
    return this.database;
  }
}
