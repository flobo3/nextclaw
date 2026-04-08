import { useEffect, useState } from 'react';
import type { AgentProfileView } from '@/api/types';
import { ProviderScopedModelInput } from '@/components/common/ProviderScopedModelInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import type { ProviderModelCatalogItem } from '@/lib/provider-models';
import { Pencil, Plus } from 'lucide-react';

export type AgentCreateFormState = {
  id: string;
  displayName: string;
  description: string;
  avatar: string;
  home: string;
  model: string;
  runtime: string;
};

export type AgentEditFormState = {
  displayName: string;
  description: string;
  avatar: string;
  model: string;
  runtime: string;
};

export const EMPTY_AGENT_CREATE_FORM: AgentCreateFormState = {
  id: '',
  displayName: '',
  description: '',
  avatar: '',
  model: '',
  home: '',
  runtime: ''
};

export const EMPTY_AGENT_EDIT_FORM: AgentEditFormState = {
  displayName: '',
  description: '',
  avatar: '',
  model: '',
  runtime: ''
};

export function toAgentEditFormState(agent: AgentProfileView): AgentEditFormState {
  return {
    displayName: agent.displayName ?? '',
    description: agent.description ?? '',
    avatar: agent.avatar ?? '',
    model: agent.model ?? '',
    runtime: agent.runtime ?? agent.engine ?? ''
  };
}

type AgentCreateDialogProps = {
  open: boolean;
  pending: boolean;
  providerCatalog: ProviderModelCatalogItem[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AgentCreateFormState) => Promise<void> | void;
};

export function AgentCreateDialog({ open, pending, providerCatalog, onOpenChange, onSubmit }: AgentCreateDialogProps) {
  const [form, setForm] = useState<AgentCreateFormState>(EMPTY_AGENT_CREATE_FORM);

  useEffect(() => {
    if (open || pending) {
      return;
    }
    setForm(EMPTY_AGENT_CREATE_FORM);
  }, [open, pending]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value
                }))
              }
              placeholder={t('agentsFormDescriptionPlaceholder')}
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
            <ProviderScopedModelInput
              value={form.model}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, model: value }))
              }
              providerCatalog={providerCatalog}
              disabled={pending}
              modelPlaceholder="gpt-5.1"
              className="md:col-span-2"
            />
            <Input
              value={form.runtime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, runtime: event.target.value }))
              }
              placeholder={t('agentsFormRuntimePlaceholder')}
            />
          </div>
          <div className="rounded-2xl border border-[#efe3ca] bg-[#fff9ef] px-4 py-3 text-xs leading-6 text-[#7a6246]">
            {t('agentsCreateDialogHint')}
          </div>
        </div>
        <DialogFooter className="border-t border-[#f1e7d4] px-6 py-5">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            className="rounded-2xl bg-[#1f5c4d] px-5 text-white hover:bg-[#184d40]"
            onClick={() => void onSubmit(form)}
            disabled={pending || form.id.trim().length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('agentsCreateAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AgentEditDialogProps = {
  agent: AgentProfileView | null;
  pending: boolean;
  providerCatalog: ProviderModelCatalogItem[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (agentId: string, form: AgentEditFormState) => Promise<void> | void;
};

export function AgentEditDialog({ agent, pending, providerCatalog, onOpenChange, onSubmit }: AgentEditDialogProps) {
  const [form, setForm] = useState<AgentEditFormState>(EMPTY_AGENT_EDIT_FORM);

  useEffect(() => {
    if (!agent) {
      setForm(EMPTY_AGENT_EDIT_FORM);
      return;
    }
    setForm(toAgentEditFormState(agent));
  }, [agent]);

  return (
    <Dialog open={agent !== null} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-none bg-[linear-gradient(180deg,#fff9f1_0%,#ffffff_24%)] p-0 sm:max-w-xl">
        <div className="border-b border-[#f0e2c8] px-6 py-6">
          <DialogHeader className="text-left">
            <DialogTitle>{t('agentsEditDialogTitle')}</DialogTitle>
            <DialogDescription>{t('agentsEditDialogDescription')}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div className="rounded-2xl border border-[#efe3ca] bg-[#fff9ef] px-4 py-3 text-xs leading-6 text-[#7a6246]">
            <div className="font-semibold uppercase tracking-[0.16em] text-[#9b6118]">
              {t('agentsEditHomeReadonly')}
            </div>
            <div className="mt-1 break-all text-sm text-[#3f3323]">
              {agent?.workspace ?? '-'}
            </div>
            <div className="mt-1 text-[11px] text-[#8d7456]">
              {t('agentsEditHomeReadonlyHint')}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value
                }))
              }
              placeholder={t('agentsFormDescriptionPlaceholder')}
            />
            <Input
              value={form.avatar}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, avatar: event.target.value }))
              }
              placeholder={t('agentsFormAvatarPlaceholder')}
            />
            <ProviderScopedModelInput
              value={form.model}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, model: value }))
              }
              providerCatalog={providerCatalog}
              disabled={pending}
              modelPlaceholder="gpt-5.1"
              className="md:col-span-2"
            />
            <Input
              value={form.runtime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, runtime: event.target.value }))
              }
              placeholder={t('agentsFormRuntimePlaceholder')}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-[#f1e7d4] px-6 py-5">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            className="rounded-2xl bg-[#1f5c4d] px-5 text-white hover:bg-[#184d40]"
            onClick={() => agent && onSubmit(agent.id, form)}
            disabled={pending || agent === null}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t('agentsEditSaveAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
