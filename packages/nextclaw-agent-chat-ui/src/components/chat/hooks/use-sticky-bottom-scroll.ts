import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

type UseStickyBottomScrollParams = {
  scrollRef: RefObject<HTMLElement>;
  resetKey: string | null;
  isLoading: boolean;
  hasContent: boolean;
  contentVersion: unknown;
  stickyThresholdPx?: number;
};

type UseStickyBottomScrollResult = {
  onScroll: () => void;
};

const DEFAULT_STICKY_THRESHOLD_PX = 10;

function scrollElementToBottom(element: HTMLElement) {
  element.scrollTop = element.scrollHeight;
}

function queueScrollToBottom(params: {
  scrollRef: RefObject<HTMLElement>;
  scheduledScrollFrameRef: { current: number | null };
  isProgrammaticScrollRef: { current: boolean };
}) {
  const element = params.scrollRef.current;
  if (!element) {
    return;
  }

  if (params.scheduledScrollFrameRef.current !== null) {
    cancelAnimationFrame(params.scheduledScrollFrameRef.current);
  }

  params.scheduledScrollFrameRef.current = requestAnimationFrame(() => {
    params.scheduledScrollFrameRef.current = null;
    const currentElement = params.scrollRef.current;
    if (!currentElement) {
      return;
    }

    params.isProgrammaticScrollRef.current = true;
    scrollElementToBottom(currentElement);
  });
}

export function useStickyBottomScroll(
  params: UseStickyBottomScrollParams,
): UseStickyBottomScrollResult {
  const isStickyRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const previousResetKeyRef = useRef<string | null>(null);
  const pendingInitialScrollRef = useRef(false);
  const scheduledScrollFrameRef = useRef<number | null>(null);

  const onScroll = () => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    const element = params.scrollRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    isStickyRef.current =
      distanceFromBottom <=
      (params.stickyThresholdPx ?? DEFAULT_STICKY_THRESHOLD_PX);
  };

  useEffect(() => {
    if (previousResetKeyRef.current === params.resetKey) {
      return;
    }

    previousResetKeyRef.current = params.resetKey;
    isStickyRef.current = true;
    pendingInitialScrollRef.current = true;
  }, [params.resetKey]);

  useEffect(() => {
    const scheduledScrollFrame = scheduledScrollFrameRef.current;
    return () => {
      if (scheduledScrollFrame !== null) {
        cancelAnimationFrame(scheduledScrollFrame);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (
      !pendingInitialScrollRef.current ||
      params.isLoading ||
      !params.hasContent
    ) {
      return;
    }

    const element = params.scrollRef.current;
    if (!element) {
      return;
    }

    pendingInitialScrollRef.current = false;
    queueScrollToBottom({
      scrollRef: params.scrollRef,
      scheduledScrollFrameRef,
      isProgrammaticScrollRef,
    });
  }, [params.hasContent, params.isLoading, params.scrollRef]);

  useLayoutEffect(() => {
    if (!isStickyRef.current || !params.hasContent) {
      return;
    }

    const element = params.scrollRef.current;
    if (!element) {
      return;
    }

    queueScrollToBottom({
      scrollRef: params.scrollRef,
      scheduledScrollFrameRef,
      isProgrammaticScrollRef,
    });
  }, [params.contentVersion, params.hasContent, params.scrollRef]);

  return { onScroll };
}
