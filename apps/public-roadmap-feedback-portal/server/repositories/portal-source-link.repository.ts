import type { D1Database } from "../portal-env.types.js";
import type { PortalSourceLinkRecord } from "../portal-source-link.types.js";

export class PortalSourceLinkRepository {
  readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  replaceProviderLinks = async (provider: string, links: PortalSourceLinkRecord[]): Promise<void> => {
    await this.db.prepare("DELETE FROM item_source_links WHERE provider = ?").bind(provider).run();

    if (links.length === 0) {
      return;
    }

    const statements = links.map((link) => this.db.prepare(
      `INSERT INTO item_source_links (
        id,
        item_id,
        provider,
        provider_object_id,
        provider_url,
        source_status,
        source_type,
        team_key,
        raw_payload_json,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `${provider}:${link.providerObjectId}`,
      link.itemId,
      link.provider,
      link.providerObjectId,
      link.providerUrl,
      link.sourceStatus,
      link.sourceType,
      link.teamKey,
      link.rawPayloadJson,
      link.lastSyncedAt
    ));

    if (this.db.batch) {
      await this.db.batch(statements);
      return;
    }

    for (const statement of statements) {
      await statement.run();
    }
  };
}
