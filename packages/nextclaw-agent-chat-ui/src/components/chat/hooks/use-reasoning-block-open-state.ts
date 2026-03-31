import { useEffect, useRef, useState, type MouseEvent } from "react";

type UseReasoningBlockOpenStateParams = {
  isInProgress: boolean;
};

type UseReasoningBlockOpenStateResult = {
  isOpen: boolean;
  onSummaryClick: (event: MouseEvent<HTMLElement>) => void;
};

export function useReasoningBlockOpenState(
  params: UseReasoningBlockOpenStateParams,
): UseReasoningBlockOpenStateResult {
  const { isInProgress } = params;
  const [isOpen, setIsOpen] = useState(isInProgress);
  const [keepOpenAfterCompletion, setKeepOpenAfterCompletion] = useState(false);
  const previousInProgressRef = useRef(isInProgress);

  useEffect(() => {
    const wasInProgress = previousInProgressRef.current;
    if (!wasInProgress && isInProgress) {
      setIsOpen(true);
      setKeepOpenAfterCompletion(false);
    } else if (wasInProgress && !isInProgress && !keepOpenAfterCompletion) {
      setIsOpen(false);
    }
    previousInProgressRef.current = isInProgress;
  }, [isInProgress, keepOpenAfterCompletion]);

  function onSummaryClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen) {
      setKeepOpenAfterCompletion(false);
      return;
    }

    if (isInProgress) {
      setKeepOpenAfterCompletion(true);
    }
  }

  return {
    isOpen,
    onSummaryClick,
  };
}
