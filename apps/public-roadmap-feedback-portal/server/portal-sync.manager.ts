import type { PublicItemRepository } from "./repositories/public-item.repository.js";
import type { PortalSourceLinkRepository } from "./repositories/portal-source-link.repository.js";
import type { LinearSourceProvider } from "./providers/linear-source.provider.js";

export class PortalSyncManager {
  readonly linearSourceAdapter: LinearSourceProvider;
  readonly publicItemRepository: PublicItemRepository;
  readonly portalSourceLinkRepository: PortalSourceLinkRepository;

  constructor(params: {
    linearSourceAdapter: LinearSourceProvider;
    publicItemRepository: PublicItemRepository;
    portalSourceLinkRepository: PortalSourceLinkRepository;
  }) {
    this.linearSourceAdapter = params.linearSourceAdapter;
    this.publicItemRepository = params.publicItemRepository;
    this.portalSourceLinkRepository = params.portalSourceLinkRepository;
  }

  syncLinearRoadmap = async (): Promise<{
    syncedCount: number;
    syncedAt: string;
  }> => {
    const syncedItems = await this.linearSourceAdapter.listPublicItems();
    await this.publicItemRepository.replaceSourceItems("linear", syncedItems.map((entry) => entry.item));
    await this.portalSourceLinkRepository.replaceProviderLinks("linear", syncedItems.map((entry) => entry.sourceLink));
    return {
      syncedCount: syncedItems.length,
      syncedAt: new Date().toISOString()
    };
  };
}
