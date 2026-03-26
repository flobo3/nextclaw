import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateNcpSession } from '@/api/ncp-session';
import { t } from '@/lib/i18n';

type UpdateChatSessionLabelParams = {
  sessionKey: string;
  label: string | null;
};

export function useChatSessionLabelService() {
  const queryClient = useQueryClient();

  return async (params: UpdateChatSessionLabelParams): Promise<void> => {
    try {
      await updateNcpSession(params.sessionKey, { label: params.label });
      queryClient.invalidateQueries({ queryKey: ['ncp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ncp-session-messages', params.sessionKey] });
      toast.success(t('configSavedApplied'));
    } catch (error) {
      toast.error(t('configSaveFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };
}
