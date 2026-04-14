import { createContext, useContext, type PropsWithChildren } from "react";
import { CommunityFeedbackManager } from "../managers/community-feedback.manager";
import { ItemDetailManager } from "../managers/item-detail.manager";
import { RoadmapViewManager } from "../managers/roadmap-view.manager";

export class PortalPresenterService {
  readonly communityFeedbackManager = new CommunityFeedbackManager();
  readonly roadmapViewManager = new RoadmapViewManager();
  readonly itemDetailManager = new ItemDetailManager();
}

const portalPresenterService = new PortalPresenterService();
const PresenterContext = createContext<PortalPresenterService>(portalPresenterService);

export function PortalPresenterProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <PresenterContext.Provider value={portalPresenterService}>
      {children}
    </PresenterContext.Provider>
  );
}

export function usePortalPresenter(): PortalPresenterService {
  return useContext(PresenterContext);
}
