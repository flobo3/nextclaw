import type { MarketplaceItemType } from "../domain/model";
import { D1MarketplaceSectionDataSourceBase } from "./d1-section-data-source-base";
import type { TableNames } from "./skills/d1-section-types";

export {
  D1MarketplaceSectionDataSourceBase
} from "./d1-section-data-source-base";
export {
  type ItemRow,
  type MarketplaceSkillFile,
  type MarketplaceSkillPublishActor,
  type MarketplaceSkillUpsertInput,
  type SceneRow,
  type SkillFileRow
} from "./skills/d1-section-types";
export { D1MarketplaceSkillDataSource } from "./d1-skill-data-source";

export class D1MarketplacePluginDataSource extends D1MarketplaceSectionDataSourceBase {
  constructor(db: D1Database) {
    super(db);
  }

  protected getItemType(): MarketplaceItemType {
    return "plugin";
  }

  protected getTables(): TableNames {
    return {
      items: "marketplace_plugin_items",
      scenes: "marketplace_plugin_recommendation_scenes",
      sceneItems: "marketplace_plugin_recommendation_items"
    };
  }
}
