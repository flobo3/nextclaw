import type { PublicItem } from "../shared/public-roadmap-feedback-portal.types.js";
import type { PortalSourceLinkRecord } from "./portal-source-link.types.js";

export type SyncedPortalItem = {
  item: PublicItem;
  sourceLink: PortalSourceLinkRecord;
};
