import { DomainValidationError } from "../domain/errors";
import type { MarketplaceCatalogSection, MarketplaceItem, MarketplaceItemType, MarketplaceSkillInstallSpec } from "../domain/model";
import { D1MarketplaceSectionDataSourceBase } from "./d1-section-data-source-base";
import { MarketplaceSkillFileStore } from "./skills/marketplace-skill-file-store";
import {
  assertExistingSkillOwnership,
  normalizeRelativeFilePath,
  parseSkillReviewInput,
  parseSkillUpsertInput,
  resolveSkillIdentity,
  type ExistingSkillRow,
  type MarketplaceResolvedSkillIdentity
} from "./skills/marketplace-skill-payload";
import type {
  ItemRow,
  MarketplaceSkillFile,
  MarketplaceSkillPublishActor,
  MarketplaceSkillUpsertInput,
  SceneRow,
  SkillFileRow,
  TableNames
} from "./skills/d1-section-types";

type SkillUpsertContext = { existing: ExistingSkillRow | null; itemId: string; publishedAt: string; updatedAt: string; publishStatus: "pending" | "published"; publishedByType: "admin" | "user"; authorLabel: string; install: MarketplaceSkillInstallSpec; };

export class D1MarketplaceSkillDataSource extends D1MarketplaceSectionDataSourceBase {
  private readonly fileStore: MarketplaceSkillFileStore;
  constructor(db: D1Database, filesBucket: R2Bucket) {
    super(db);
    this.fileStore = new MarketplaceSkillFileStore(db, filesBucket, (raw, path) => this.decodeBase64(raw, path), (bytes) => this.sha256Hex(bytes));
  }

  protected getItemType = (): MarketplaceItemType => {
    return "skill";
  };

  protected getTables = (): TableNames => {
    return {
      items: "marketplace_skill_items",
      scenes: "marketplace_skill_recommendation_scenes",
      sceneItems: "marketplace_skill_recommendation_items"
    };
  };

  override loadSection = async (): Promise<MarketplaceCatalogSection> => {
    const itemsResult = await this.db
      .prepare(`
        SELECT
          id,
          slug,
          package_name,
          owner_scope,
          skill_name,
          publish_status,
          published_by_type,
          name,
          summary,
          summary_i18n,
          description,
          description_i18n,
          tags,
          author,
          source_repo,
          homepage,
          install_kind,
          install_spec,
          install_command,
          published_at,
          updated_at
        FROM marketplace_skill_items
        WHERE publish_status = 'published'
      `)
      .all<ItemRow>();

    const sceneResult = await this.db
      .prepare(`
        SELECT
          s.id AS scene_id,
          s.title,
          s.description,
          i.item_id
        FROM marketplace_skill_recommendation_scenes s
        LEFT JOIN marketplace_skill_recommendation_items i ON i.scene_id = s.id
        ORDER BY s.id ASC, i.sort_order ASC
      `)
      .all<SceneRow>();

    const items = (itemsResult.results ?? []).map((row) => this.mapItemRow(row));
    const recommendations = this.mapScenes(sceneResult.results ?? [], items);

    return {
      items,
      recommendations
    };
  };

  getSkillFilesBySlug = async (selector: string): Promise<{
    item: MarketplaceItem;
    files: MarketplaceSkillFile[];
  } | null> => {
    const item = await this.getSkillItemBySelector(selector, { includeUnpublished: false });
    if (!item) {
      return null;
    }

    const files = await this.fileStore.listItemFileRows(item.id);
    const metadata = await Promise.all(files.map(async (row) => {
      const resolvedSizeBytes = Number.isFinite(row.size_bytes)
        ? Number(row.size_bytes)
        : row.content_b64
          ? this.fileStore.mapSkillFileMetadata(row).sizeBytes
          : undefined;
      return this.fileStore.mapSkillFileMetadata(row, resolvedSizeBytes);
    }));

    return {
      item,
      files: metadata
    };
  };

  getSkillFileContentBySlug = async (selector: string, filePath: string): Promise<{
    item: MarketplaceItem;
    file: MarketplaceSkillFile;
    bytes: Uint8Array;
  } | null> => {
    const item = await this.getSkillItemBySelector(selector, { includeUnpublished: false });
    if (!item) {
      return null;
    }

    const row = await this.db
      .prepare(`
        SELECT file_path, content_b64, content_sha256, updated_at, storage_backend, r2_key, size_bytes
        FROM marketplace_skill_files
        WHERE skill_item_id = ? AND file_path = ?
        LIMIT 1
      `)
      .bind(item.id, normalizeRelativeFilePath(filePath, "query.path"))
      .first<SkillFileRow>();

    if (!row) {
      return null;
    }

    const bytes = await this.fileStore.readSkillFileBytes(item.id, row);
    return {
      item,
      file: this.fileStore.mapSkillFileMetadata(row, bytes.byteLength),
      bytes
    };
  };

  upsertSkill = async (
    rawInput: unknown,
    actor: MarketplaceSkillPublishActor
  ): Promise<{ created: boolean; item: MarketplaceItem; fileCount: number }> => {
    const input = parseSkillUpsertInput(rawInput, this.validationTools);
    const resolvedIdentity = resolveSkillIdentity(input, actor);
    const context = await this.resolveSkillUpsertContext(input, actor, resolvedIdentity);

    await this.persistSkillItem({
      input,
      identity: resolvedIdentity,
      context
    });
    await this.fileStore.replaceSkillFiles(context.itemId, input.files, context.updatedAt);
    await this.ensureDefaultSkillRecommendation(context.itemId);

    const item = await this.getSkillItemBySelector(resolvedIdentity.packageName, { includeUnpublished: true });
    if (!item) {
      throw new DomainValidationError(`upsert succeeded but item not found: ${resolvedIdentity.packageName}`);
    }

    return {
      created: !context.existing,
      item,
      fileCount: input.files.length
    };
  };

  reviewSkill = async (rawInput: unknown): Promise<MarketplaceItem> => {
    const input = parseSkillReviewInput(rawInput, this.validationTools);
    const item = await this.getSkillItemBySelector(input.selector, { includeUnpublished: true });
    if (!item || item.type !== "skill") {
      throw new DomainValidationError(`skill item not found: ${input.selector}`);
    }

    const updatedAt = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE marketplace_skill_items
        SET publish_status = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(input.publishStatus, updatedAt, item.id)
      .run();

    const nextItem = await this.getSkillItemBySelector(item.packageName, { includeUnpublished: true });
    if (!nextItem) {
      throw new DomainValidationError(`review succeeded but item not found: ${item.packageName}`);
    }
    return nextItem;
  };

  private resolveSkillUpsertContext = async (
    input: MarketplaceSkillUpsertInput,
    actor: MarketplaceSkillPublishActor,
    identity: MarketplaceResolvedSkillIdentity
  ): Promise<SkillUpsertContext> => {
    const existing = await this.db
      .prepare(`
        SELECT id, package_name, owner_scope, skill_name, owner_user_id, published_at
        FROM marketplace_skill_items
        WHERE package_name = ?
        LIMIT 1
      `)
      .bind(identity.packageName)
      .first<ExistingSkillRow>();

    if (input.requireExisting && !existing) {
      throw new DomainValidationError(`skill does not exist yet: ${identity.packageName}`);
    }
    if (existing) {
      assertExistingSkillOwnership(existing, identity, actor);
    }

    const nowIso = new Date().toISOString();
    const itemId = existing?.id ?? input.id ?? `skill-${identity.ownerScope}-${identity.skillName}`;
    const publishedAt = input.publishedAt ?? existing?.published_at ?? nowIso;
    const updatedAt = input.updatedAt ?? nowIso;
    return {
      existing: existing ?? null,
      itemId,
      publishedAt,
      updatedAt,
      publishStatus: identity.ownerScope === "nextclaw" ? "published" : "pending",
      publishedByType: identity.ownerScope === "nextclaw" ? "admin" : "user",
      authorLabel: identity.ownerScope === "nextclaw" ? "NextClaw" : (actor.username ?? "unknown"),
      install: {
        kind: "marketplace",
        spec: identity.packageName,
        command: `nextclaw skills install ${identity.packageName}`
      }
    };
  };

  private persistSkillItem = async (params: {
    input: MarketplaceSkillUpsertInput;
    identity: MarketplaceResolvedSkillIdentity;
    context: SkillUpsertContext;
  }): Promise<void> => {
    const { input, identity, context } = params;
    await this.db
      .prepare(`
        INSERT INTO marketplace_skill_items (
          id, slug, package_name, owner_user_id, owner_scope, skill_name,
          publish_status, published_by_type,
          name, summary, summary_i18n, description, description_i18n,
          tags, author, source_repo, homepage, install_kind, install_spec, install_command,
          published_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(package_name) DO UPDATE SET
          slug = excluded.slug,
          owner_user_id = excluded.owner_user_id,
          owner_scope = excluded.owner_scope,
          skill_name = excluded.skill_name,
          publish_status = excluded.publish_status,
          published_by_type = excluded.published_by_type,
          name = excluded.name,
          summary = excluded.summary,
          summary_i18n = excluded.summary_i18n,
          description = excluded.description,
          description_i18n = excluded.description_i18n,
          tags = excluded.tags,
          author = excluded.author,
          source_repo = excluded.source_repo,
          homepage = excluded.homepage,
          install_kind = excluded.install_kind,
          install_spec = excluded.install_spec,
          install_command = excluded.install_command,
          updated_at = excluded.updated_at
      `)
      .bind(
        context.itemId,
        identity.slug,
        identity.packageName,
        identity.ownerUserId,
        identity.ownerScope,
        identity.skillName,
        context.publishStatus,
        context.publishedByType,
        input.name,
        input.summary,
        JSON.stringify(input.summaryI18n),
        input.description ?? null,
        input.descriptionI18n ? JSON.stringify(input.descriptionI18n) : null,
        JSON.stringify(input.tags),
        context.authorLabel,
        input.sourceRepo ?? null,
        input.homepage ?? null,
        context.install.kind,
        context.install.spec,
        context.install.command,
        context.publishedAt,
        context.updatedAt
      )
      .run();
  };

  private ensureDefaultSkillRecommendation = async (itemId: string): Promise<void> => {
    const sceneId = "skills-default";
    await this.db
      .prepare(`
        INSERT OR IGNORE INTO marketplace_skill_recommendation_scenes (id, title, description)
        VALUES (?, ?, ?)
      `)
      .bind(sceneId, "Recommended Skills", "Curated skill list")
      .run();

    const maxSortRow = await this.db
      .prepare("SELECT MAX(sort_order) AS max_sort FROM marketplace_skill_recommendation_items WHERE scene_id = ?")
      .bind(sceneId)
      .first<{ max_sort: number | null }>();

    const nextSort = Number.isFinite(maxSortRow?.max_sort) ? Number(maxSortRow?.max_sort) + 1 : 0;

    await this.db
      .prepare(`
        INSERT OR IGNORE INTO marketplace_skill_recommendation_items (scene_id, item_id, sort_order)
        VALUES (?, ?, ?)
      `)
      .bind(sceneId, itemId, nextSort)
      .run();
  };

  private getSkillItemBySelector = async (
    selector: string,
    options: { includeUnpublished?: boolean } = {}
  ): Promise<MarketplaceItem | null> => {
    const filters = [
      "(slug = ? OR package_name = ?)"
    ];
    if (!options.includeUnpublished) {
      filters.push("publish_status = 'published'");
    }
    const row = await this.db
      .prepare(`
        SELECT
          id,
          slug,
          package_name,
          owner_scope,
          skill_name,
          publish_status,
          published_by_type,
          name,
          summary,
          summary_i18n,
          description,
          description_i18n,
          tags,
          author,
          source_repo,
          homepage,
          install_kind,
          install_spec,
          install_command,
          published_at,
          updated_at
        FROM marketplace_skill_items
        WHERE ${filters.join(" AND ")}
        LIMIT 1
      `)
      .bind(selector, selector)
      .first<ItemRow>();

    if (!row) {
      return null;
    }

    return this.mapItemRow(row);
  };
  private get validationTools() {
    return {
      isRecord: (value: unknown): value is Record<string, unknown> => this.isRecord(value),
      readSlug: (value: unknown, path: string) => this.readSlug(value, path),
      readString: (value: unknown, path: string) => this.readString(value, path),
      readOptionalString: (value: unknown, path: string) => this.readOptionalString(value, path),
      readLocalizedTextMap: (value: unknown, path: string, fallbackEn: string) => this.readLocalizedTextMap(value, path, fallbackEn),
      readStringArray: (value: unknown, path: string) => this.readStringArray(value, path),
      readOptionalDateTime: (value: unknown, path: string) => this.readOptionalDateTime(value, path),
      decodeBase64: (raw: string, path: string) => this.decodeBase64(raw, path)
    };
  }
}
