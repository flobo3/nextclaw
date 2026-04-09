import { ResourceNotFoundError } from "../../domain/errors";
import type { MarketplaceItem, MarketplaceMcpItem, MarketplaceSkillItem } from "../../domain/model";

export function ensureSkillItem(item: MarketplaceItem): asserts item is MarketplaceSkillItem {
  if (item.type !== "skill") {
    throw new ResourceNotFoundError(`skill item not found: ${item.slug}`);
  }
}

export function ensureMcpItem(item: MarketplaceItem): asserts item is MarketplaceMcpItem {
  if (item.type !== "mcp") {
    throw new ResourceNotFoundError(`mcp item not found: ${item.slug}`);
  }
}
