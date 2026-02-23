import type { Context } from "hono";
import { DomainValidationError } from "../../domain/errors";
import { MARKETPLACE_ITEM_TYPES, type MarketplaceItemType, type MarketplaceListQuery, type MarketplaceSort } from "../../domain/model";

const SORT_VALUES: MarketplaceSort[] = ["relevance", "updated", "downloads"];

export class MarketplaceQueryParser {
  parseListQuery(c: Context): MarketplaceListQuery {
    const query = c.req.query();
    const page = this.readPage(query.page);
    const pageSize = this.readPageSize(query.pageSize);
    const sort = this.readSort(query.sort);
    const type = this.readType(query.type);

    return {
      q: this.readOptionalString(query.q),
      tag: this.readOptionalString(query.tag),
      type,
      page,
      pageSize,
      sort
    };
  }

  parseItemType(c: Context): MarketplaceItemType | undefined {
    const query = c.req.query();
    return this.readType(query.type);
  }

  parseRecommendationScene(c: Context): string | undefined {
    return this.readOptionalString(c.req.query("scene"));
  }

  parseRecommendationLimit(c: Context): number {
    const limit = c.req.query("limit");
    if (!limit) {
      return 10;
    }

    const parsed = Number.parseInt(limit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new DomainValidationError("query.limit must be a positive integer");
    }

    return Math.min(parsed, 50);
  }

  private readPage(rawPage: string | undefined): number {
    if (!rawPage) {
      return 1;
    }

    const parsed = Number.parseInt(rawPage, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new DomainValidationError("query.page must be a positive integer");
    }

    return parsed;
  }

  private readPageSize(rawPageSize: string | undefined): number {
    if (!rawPageSize) {
      return 20;
    }

    const parsed = Number.parseInt(rawPageSize, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new DomainValidationError("query.pageSize must be a positive integer");
    }

    return Math.min(parsed, 100);
  }

  private readSort(rawSort: string | undefined): MarketplaceSort {
    if (!rawSort) {
      return "relevance";
    }

    if (!SORT_VALUES.includes(rawSort as MarketplaceSort)) {
      throw new DomainValidationError("query.sort is invalid");
    }

    return rawSort as MarketplaceSort;
  }

  private readType(rawType: string | undefined): MarketplaceItemType | undefined {
    if (!rawType) {
      return undefined;
    }

    if (!MARKETPLACE_ITEM_TYPES.includes(rawType as MarketplaceItemType)) {
      throw new DomainValidationError("query.type is invalid");
    }

    return rawType as MarketplaceItemType;
  }

  private readOptionalString(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
