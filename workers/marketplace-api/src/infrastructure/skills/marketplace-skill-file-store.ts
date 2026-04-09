import { DomainValidationError } from "../../domain/errors";
import type { MarketplaceSkillFile, SkillFileRow } from "./d1-section-types";

export class MarketplaceSkillFileStore {
  constructor(
    private readonly db: D1Database,
    private readonly filesBucket: R2Bucket,
    private readonly decodeBase64: (raw: string, path: string) => Uint8Array,
    private readonly sha256Hex: (bytes: Uint8Array) => Promise<string>
  ) {}

  listItemFileRows = async (itemId: string): Promise<SkillFileRow[]> => {
    const filesResult = await this.db
      .prepare(`
        SELECT file_path, content_b64, content_sha256, updated_at, storage_backend, r2_key, size_bytes
        FROM marketplace_skill_files
        WHERE skill_item_id = ?
        ORDER BY file_path ASC
      `)
      .bind(itemId)
      .all<SkillFileRow>();

    return filesResult.results ?? [];
  };

  replaceSkillFiles = async (
    itemId: string,
    files: Array<{ path: string; contentBase64: string }>,
    updatedAt: string
  ): Promise<void> => {
    const existingFileRows = await this.listItemFileRows(itemId);

    await this.db.prepare("DELETE FROM marketplace_skill_files WHERE skill_item_id = ?").bind(itemId).run();

    const staleR2Keys = existingFileRows
      .filter((row) => row.storage_backend === "r2" && typeof row.r2_key === "string" && row.r2_key.trim().length > 0)
      .map((row) => row.r2_key as string);
    if (staleR2Keys.length > 0) {
      await this.filesBucket.delete(staleR2Keys);
    }

    for (const file of files) {
      const bytes = this.decodeBase64(file.contentBase64, `files.${file.path}`);
      const sha256 = await this.sha256Hex(bytes);
      const r2Key = this.buildSkillFileObjectKey(itemId, file.path, sha256);
      await this.filesBucket.put(r2Key, bytes);
      await this.db
        .prepare(`
          INSERT INTO marketplace_skill_files (
            skill_item_id,
            file_path,
            content_b64,
            content_sha256,
            storage_backend,
            r2_key,
            size_bytes,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(itemId, file.path, "", sha256, "r2", r2Key, bytes.byteLength, updatedAt)
        .run();
    }
  };

  mapSkillFileMetadata = (row: SkillFileRow, resolvedSizeBytes?: number): MarketplaceSkillFile => {
    const sizeBytes = Number.isFinite(resolvedSizeBytes)
      ? Number(resolvedSizeBytes)
      : Number.isFinite(row.size_bytes)
        ? Number(row.size_bytes)
        : this.estimateBase64Size(row.content_b64);

    return {
      path: row.file_path,
      sha256: row.content_sha256,
      sizeBytes,
      updatedAt: row.updated_at
    };
  };

  readSkillFileBytes = async (itemId: string, row: SkillFileRow): Promise<Uint8Array> => {
    if (row.storage_backend === "r2" && row.r2_key) {
      const object = await this.filesBucket.get(row.r2_key);
      if (object) {
        return new Uint8Array(await object.arrayBuffer());
      }
    }

    if (!row.content_b64) {
      throw new DomainValidationError(`skill file content missing: ${row.file_path}`);
    }

    const bytes = this.decodeBase64(row.content_b64, `marketplace_skill_files.content_b64(${row.file_path})`);
    const sha256 = await this.sha256Hex(bytes);
    const r2Key = row.r2_key ?? this.buildSkillFileObjectKey(itemId, row.file_path, sha256);

    await this.filesBucket.put(r2Key, bytes);
    await this.db
      .prepare(`
        UPDATE marketplace_skill_files
        SET content_b64 = '',
            content_sha256 = ?,
            storage_backend = 'r2',
            r2_key = ?,
            size_bytes = ?
        WHERE skill_item_id = ? AND file_path = ?
      `)
      .bind(sha256, r2Key, bytes.byteLength, itemId, row.file_path)
      .run();

    return bytes;
  };

  private estimateBase64Size = (raw: string): number => {
    if (!raw) {
      return 0;
    }
    const sanitized = raw.replace(/\s+/g, "");
    const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
  };

  private buildSkillFileObjectKey = (itemId: string, filePath: string, sha256: string): string => {
    const encodedPath = filePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `skills/${encodeURIComponent(itemId)}/${sha256}/${encodedPath}`;
  };
}
