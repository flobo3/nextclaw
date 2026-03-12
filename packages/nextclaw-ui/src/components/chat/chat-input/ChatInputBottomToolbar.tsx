import { SkillsPicker } from '@/components/chat/SkillsPicker';
import { usePresenter } from '@/components/chat/presenter/chat-presenter-context';
import { useChatInputStore } from '@/components/chat/stores/chat-input.store';
import { ChatInputAttachButton } from '@/components/chat/chat-input/components/bottom-toolbar/ChatInputAttachButton';
import { ChatInputModelSelector } from '@/components/chat/chat-input/components/bottom-toolbar/ChatInputModelSelector';
import { ChatInputSendControls } from '@/components/chat/chat-input/components/bottom-toolbar/ChatInputSendControls';
import { ChatInputSessionTypeSelector } from '@/components/chat/chat-input/components/bottom-toolbar/ChatInputSessionTypeSelector';
import { ChatInputThinkingSelector } from '@/components/chat/chat-input/components/bottom-toolbar/ChatInputThinkingSelector';
import { t } from '@/lib/i18n';

export function ChatInputBottomToolbar() {
  const presenter = usePresenter();
  const snapshot = useChatInputStore((state) => state.snapshot);

  const hasModelOptions = snapshot.modelOptions.length > 0;
  const isModelOptionsLoading = !snapshot.isProviderStateResolved && !hasModelOptions;
  const selectedModelOption = snapshot.modelOptions.find((option) => option.value === snapshot.selectedModel);
  const shouldShowSessionTypeSelector =
    snapshot.canEditSessionType &&
    (snapshot.sessionTypeOptions.length > 1 ||
      Boolean(snapshot.selectedSessionType && snapshot.selectedSessionType !== 'native'));
  const selectedSessionTypeOption =
    snapshot.sessionTypeOptions.find((option) => option.value === snapshot.selectedSessionType) ??
    (snapshot.selectedSessionType
      ? { value: snapshot.selectedSessionType, label: snapshot.selectedSessionType }
      : null);
  const resolvedStopHint =
    snapshot.stopDisabledReason === '__preparing__'
      ? t('chatStopPreparing')
      : snapshot.stopDisabledReason?.trim() || t('chatStopUnavailable');
  const selectedModelThinkingCapability = selectedModelOption?.thinkingCapability;
  const thinkingSupportedLevels = selectedModelThinkingCapability?.supported ?? [];
  const shouldShowThinkingSelector = thinkingSupportedLevels.length > 0;

  return (
    <div className="flex items-center justify-between px-3 pb-3">
      <div className="flex items-center gap-1">
        <SkillsPicker
          records={snapshot.skillRecords}
          isLoading={snapshot.isSkillsLoading}
          selectedSkills={snapshot.selectedSkills}
          onSelectedSkillsChange={presenter.chatInputManager.selectSkills}
        />
        <ChatInputSessionTypeSelector
          shouldShowSessionTypeSelector={shouldShowSessionTypeSelector}
          selectedSessionType={snapshot.selectedSessionType}
          selectedSessionTypeOption={selectedSessionTypeOption}
          sessionTypeOptions={snapshot.sessionTypeOptions}
          onSelectedSessionTypeChange={presenter.chatInputManager.selectSessionType}
          canEditSessionType={snapshot.canEditSessionType}
        />
        <ChatInputModelSelector
          modelOptions={snapshot.modelOptions}
          selectedModel={snapshot.selectedModel}
          selectedModelOption={selectedModelOption}
          onSelectedModelChange={presenter.chatInputManager.selectModel}
          isModelOptionsLoading={isModelOptionsLoading}
          hasModelOptions={hasModelOptions}
        />
        {shouldShowThinkingSelector ? (
          <ChatInputThinkingSelector
            supportedLevels={thinkingSupportedLevels}
            selectedThinkingLevel={snapshot.selectedThinkingLevel}
            defaultThinkingLevel={selectedModelThinkingCapability?.default ?? null}
            onSelectedThinkingLevelChange={presenter.chatInputManager.selectThinkingLevel}
          />
        ) : null}
        <ChatInputAttachButton />
      </div>
      <ChatInputSendControls
        sendError={snapshot.sendError}
        draft={snapshot.draft}
        hasModelOptions={hasModelOptions}
        sessionTypeUnavailable={snapshot.sessionTypeUnavailable}
        isSending={snapshot.isSending}
        canStopGeneration={snapshot.canStopGeneration}
        resolvedStopHint={resolvedStopHint}
        onSend={presenter.chatInputManager.send}
        onStop={presenter.chatInputManager.stop}
      />
    </div>
  );
}
