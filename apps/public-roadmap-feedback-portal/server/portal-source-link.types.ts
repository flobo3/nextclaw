export type PortalSourceLinkRecord = {
  itemId: string;
  provider: string;
  providerObjectId: string;
  providerUrl: string | null;
  sourceStatus: string;
  sourceType: string | null;
  teamKey: string | null;
  rawPayloadJson: string;
  lastSyncedAt: string;
};
