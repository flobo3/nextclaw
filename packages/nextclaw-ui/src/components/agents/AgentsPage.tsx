import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAgent, useDeleteAgent, useAgents } from '@/hooks/agents/useAgents';
import { useChatSessionListStore } from '@/components/chat/stores/chat-session-list.store';
import { AgentAvatar } from '@/components/common/AgentAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLayout } from '@/components/layout/page-layout';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Bot, House, MessageCircle, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';

type CreateFormState = {
  id: string;
  displayName: string;
  avatar: string;
  home: string;
};

const EMPTY_FORM: CreateFormState = {
  id: '',
  displayName: '',
  avatar: '',
  home: ''
};

const CARD_TONES = [
  {
    hero: 'from-[#fff3d6] via-[#ffe7ba] to-[#ffd7a1]',
    chip: 'border-[#f2c97d] bg-white/80 text-[#8d5a18]',
    frame: 'shadow-[0_24px_60px_rgba(194,116,25,0.14)]'
  },
  {
    hero: 'from-[#dff7f2] via-[#cff3ea] to-[#bcece0]',
    chip: 'border-[#86d7bf] bg-white/80 text-[#156653]',
    frame: 'shadow-[0_24px_60px_rgba(25,130,105,0.12)]'
  },
  {
    hero: 'from-[#edf2ff] via-[#e3ebff] to-[#d7e5ff]',
    chip: 'border-[#b2c9ff] bg-white/80 text-[#2d4d8f]',
    frame: 'shadow-[0_24px_60px_rgba(51,87,173,0.12)]'
  }
] as const;

function resolveAgentTone(index: number, builtIn: boolean) {
  if (builtIn) {
    return {
      hero: 'from-[#fff1dd] via-[#ffe4c6] to-[#ffd4a4]',
      chip: 'border-[#efbb68] bg-white/85 text-[#90550d]',
      frame: 'shadow-[0_28px_64px_rgba(201,122,19,0.18)]'
    };
  }
  return CARD_TONES[index % CARD_TONES.length];
}

export function AgentsPage() {
  const navigate = useNavigate();
  const agentsQuery = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const setSessionListSnapshot = useChatSessionListStore((state) => state.setSnapshot);

  const agents = agentsQuery.data?.agents ?? [];
  const builtInCount = agents.filter((agent) => agent.builtIn).length;
  const customCount = Math.max(0, agents.length - builtInCount);
  const sortedAgents = useMemo(
    () =>
      [...agents].sort(
        (left, right) =>
          Number(Boolean(right.builtIn)) - Number(Boolean(left.builtIn)) ||
          left.id.localeCompare(right.id)
      ),
    [agents]
  );

  const handleCreate = async () => {
    await createAgent.mutateAsync({
      data: {
        id: form.id,
        ...(form.displayName.trim() ? { displayName: form.displayName.trim() } : {}),
        ...(form.avatar.trim() ? { avatar: form.avatar.trim() } : {}),
        ...(form.home.trim() ? { home: form.home.trim() } : {})
      }
    });
    setForm(EMPTY_FORM);
    setIsCreateDialogOpen(false);
  };

  const startChatWithAgent = (agentId: string) => {
    setSessionListSnapshot({
      selectedAgentId: agentId,
      selectedSessionKey: null
    });
    navigate('/chat');
  };

  return (
    <PageLayout className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-[#f0d6aa] bg-[linear-gradient(135deg,#fff7ea_0%,#fff9f1_34%,#f2fbff_100%)] px-6 py-7 sm:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,215,163,0.55),transparent_52%)]" />
        <div className="absolute -bottom-14 left-10 h-40 w-40 rounded-full bg-[#ffe6c0]/60 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6118]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('agentsHeroEyebrow')}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-[#2f2212] sm:text-4xl">
                {t('agentsHeroTitle')}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#6d5841] sm:text-[15px]">
                {t('agentsHeroDescription')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
            <Button
              type="button"
              className="h-11 rounded-2xl bg-[#1f5c4d] px-5 text-sm font-semibold text-white hover:bg-[#184d40]"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('agentsCreateButton')}
            </Button>
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-xs leading-6 text-[#6d5841] shadow-[0_18px_40px_rgba(167,117,47,0.08)]">
              {t('agentsCreateDialogHint')}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: t('agentsOverviewTotal'),
            value: agents.length.toString(),
            tone: 'from-[#fff4d9] to-[#ffe5bc]'
          },
          {
            label: t('agentsOverviewBuiltIn'),
            value: builtInCount.toString(),
            tone: 'from-[#e8f8f3] to-[#d4efe6]'
          },
          {
            label: t('agentsOverviewCustom'),
            value: customCount.toString(),
            tone: 'from-[#edf1ff] to-[#dde7ff]'
          }
        ].map((item) => (
          <Card
            key={item.label}
            className="overflow-hidden border border-white/80 bg-white/80 shadow-[0_24px_60px_rgba(17,24,39,0.06)]"
          >
            <CardContent className={cn('rounded-[24px] bg-gradient-to-br p-5', item.tone)}>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#7b6955]">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1f2937]">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agentsQuery.isLoading ? (
          <Card className="md:col-span-2 xl:col-span-3 border-dashed border-[#d9dce3] bg-white/70">
            <CardContent className="py-16 text-center text-sm text-gray-500">
              {t('agentsLoading')}
            </CardContent>
          </Card>
        ) : sortedAgents.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3 overflow-hidden border-dashed border-[#d9dce3] bg-[linear-gradient(135deg,#fff7ea_0%,#f4fbff_100%)]">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-[0_18px_44px_rgba(0,0,0,0.08)]">
                <Bot className="h-10 w-10 text-[#d39a3b]" />
              </div>
              <div className="text-lg font-semibold text-[#2f2212]">{t('agentsEmpty')}</div>
              <p className="mt-3 max-w-md text-sm leading-7 text-[#78644d]">
                {t('agentsEmptyDescription')}
              </p>
              <Button
                type="button"
                className="mt-6 rounded-2xl bg-[#1f5c4d] px-5 text-white hover:bg-[#184d40]"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('agentsCreateButton')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedAgents.map((agent, index) => {
            const tone = resolveAgentTone(index, Boolean(agent.builtIn));
            return (
              <Card
                key={agent.id}
                className={cn(
                  'group overflow-hidden border border-white/80 bg-white/90 transition-transform duration-300 hover:-translate-y-1',
                  tone.frame
                )}
              >
                <div className={cn('h-28 bg-gradient-to-br', tone.hero)} />
                <CardContent className="relative -mt-12 space-y-5 px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-[28px] border-4 border-white bg-white p-1 shadow-[0_18px_38px_rgba(17,24,39,0.14)]">
                      <AgentAvatar
                        agentId={agent.id}
                        displayName={agent.displayName}
                        avatarUrl={agent.avatarUrl}
                        className="h-20 w-20"
                      />
                    </div>
                    <span
                      className={cn(
                        'mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em]',
                        tone.chip
                      )}
                    >
                      {agent.builtIn ? (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {agent.builtIn ? t('agentsCardBuiltInTag') : t('agentsCardCustomTag')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xl font-semibold tracking-[-0.03em] text-[#1f2937]">
                      {agent.displayName?.trim() || agent.id}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a6c47]">
                      @{agent.id}
                    </div>
                    <p className="text-sm leading-7 text-[#5b6470]">
                      {agent.builtIn
                        ? t('agentsCardBuiltInSummary')
                        : t('agentsCardCustomSummary')}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#eef1f5] bg-[#f8fafc] p-4">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8694]">
                      <House className="h-3.5 w-3.5" />
                      {t('agentsCardHomeLabel')}
                    </div>
                    <div className="mt-3 break-all text-sm leading-6 text-[#334155]">
                      {agent.workspace ?? '-'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="rounded-2xl bg-[#1f5c4d] px-4 text-white hover:bg-[#184d40]"
                      onClick={() => startChatWithAgent(agent.id)}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {t('agentsCardStartChat')}
                    </Button>
                    {!agent.builtIn ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-2xl border border-[#ebeff4] bg-white px-4 text-[#6b7280] hover:bg-[#f8fafc]"
                        onClick={() => deleteAgent.mutate({ agentId: agent.id })}
                        disabled={deleteAgent.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('agentsRemoveAction')}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open && !createAgent.isPending) {
            setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="overflow-hidden border-none bg-[linear-gradient(180deg,#fff9f1_0%,#ffffff_24%)] p-0 sm:max-w-xl">
          <div className="border-b border-[#f0e2c8] px-6 py-6">
            <DialogHeader className="text-left">
              <DialogTitle>{t('agentsCreateDialogTitle')}</DialogTitle>
              <DialogDescription>{t('agentsCreateDialogDescription')}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={form.id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, id: event.target.value }))
                }
                placeholder={t('agentsFormIdPlaceholder')}
              />
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    displayName: event.target.value
                  }))
                }
                placeholder={t('agentsFormNamePlaceholder')}
              />
              <Input
                value={form.avatar}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, avatar: event.target.value }))
                }
                placeholder={t('agentsFormAvatarPlaceholder')}
              />
              <Input
                value={form.home}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, home: event.target.value }))
                }
                placeholder={t('agentsFormHomePlaceholder')}
              />
            </div>
            <div className="rounded-2xl border border-[#efe3ca] bg-[#fff9ef] px-4 py-3 text-xs leading-6 text-[#7a6246]">
              {t('agentsCreateDialogHint')}
            </div>
          </div>
          <DialogFooter className="border-t border-[#f1e7d4] px-6 py-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createAgent.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-[#1f5c4d] px-5 text-white hover:bg-[#184d40]"
              onClick={() => void handleCreate()}
              disabled={createAgent.isPending || form.id.trim().length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('agentsCreateAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
