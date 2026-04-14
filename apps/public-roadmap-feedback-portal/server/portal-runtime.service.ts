import type {
  ItemsQuery,
  ItemsResponse,
  PortalOverview,
  PublicItemDetail,
  UpdatesResponse
} from "../shared/public-roadmap-feedback-portal.types.js";
import { PortalConfigService } from "./portal-config.service.js";
import type { PortalWorkerEnv } from "./portal-env.types.js";
import { LinearSourceProvider } from "./providers/linear-source.provider.js";
import { PortalQueryService } from "./portal-query.service.js";
import { PublicItemRepository } from "./repositories/public-item.repository.js";
import { PortalSourceLinkRepository } from "./repositories/portal-source-link.repository.js";
import { PortalSyncManager } from "./portal-sync.manager.js";

export class PortalRuntimeService {
  readonly env: PortalWorkerEnv;
  readonly configService: PortalConfigService;

  constructor(env: PortalWorkerEnv = {}) {
    this.env = env;
    this.configService = new PortalConfigService(env);
  }

  getOverview = async (): Promise<PortalOverview> => {
    return (await this.createQueryService()).getOverview();
  };

  listItems = async (query: ItemsQuery): Promise<ItemsResponse> => {
    return (await this.createQueryService()).listItems(query);
  };

  getItemDetail = async (itemId: string): Promise<PublicItemDetail> => {
    return (await this.createQueryService()).getItemDetail(itemId);
  };

  getUpdates = async (): Promise<UpdatesResponse> => {
    return (await this.createQueryService()).getUpdates();
  };

  syncLinearRoadmap = async (): Promise<{
    syncedCount: number;
    syncedAt: string;
  }> => {
    const db = this.assertLiveDatabase();
    const syncManager = new PortalSyncManager({
      linearSourceAdapter: new LinearSourceProvider(this.configService),
      publicItemRepository: new PublicItemRepository(db),
      portalSourceLinkRepository: new PortalSourceLinkRepository(db)
    });
    return await syncManager.syncLinearRoadmap();
  };

  assertInternalToken = (authHeader: string | null): void => {
    const expectedToken = this.configService.getInternalToken();
    if (!expectedToken) {
      throw new Error("PUBLIC_ROADMAP_FEEDBACK_PORTAL_INTERNAL_TOKEN is required for sync.");
    }
    const token = `${authHeader ?? ""}`.replace(/^Bearer\s+/i, "").trim();
    if (token !== expectedToken) {
      throw new Error("Invalid internal sync token.");
    }
  };

  private createQueryService = async (): Promise<PortalQueryService> => {
    const mode = this.configService.getDataMode();
    if (mode === "preview") {
      return new PortalQueryService({
        mode: "preview"
      });
    }

    const repository = new PublicItemRepository(this.assertLiveDatabase());
    return new PortalQueryService({
      mode: "live",
      items: await repository.listItems()
    });
  };

  private assertLiveDatabase = () => {
    if (this.configService.getDataMode() !== "live") {
      throw new Error("Live database access requires PUBLIC_ROADMAP_FEEDBACK_PORTAL_DATA_MODE=live.");
    }
    if (!this.env.PUBLIC_ROADMAP_PORTAL_DB) {
      throw new Error("PUBLIC_ROADMAP_PORTAL_DB binding is required in live mode.");
    }
    return this.env.PUBLIC_ROADMAP_PORTAL_DB;
  };
}
