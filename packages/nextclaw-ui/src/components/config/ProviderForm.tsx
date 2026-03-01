import { useEffect, useMemo, useState } from 'react';
import { useConfig, useConfigMeta, useConfigSchema, useTestProviderConnection, useUpdateProvider } from '@/hooks/useConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaskedInput } from '@/components/common/MaskedInput';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';
import { StatusDot } from '@/components/ui/status-dot';
import { t } from '@/lib/i18n';
import { hintForPath } from '@/lib/config-hints';
import type { ProviderConfigUpdate, ProviderConnectionTestRequest } from '@/api/types';
import { KeyRound, Globe, Hash, RotateCcw, CircleDotDashed, Sparkles, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { CONFIG_DETAIL_CARD_CLASS, CONFIG_EMPTY_DETAIL_CARD_CLASS } from './config-layout';

type WireApiType = 'auto' | 'chat' | 'responses';

type ProviderFormProps = {
  providerName?: string;
};

function normalizeHeaders(input: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!input) {
    return null;
  }
  const entries = Object.entries(input)
    .map(([key, value]) => [key.trim(), value] as const)
    .filter(([key]) => key.length > 0);
  if (entries.length === 0) {
    return null;
  }
  return Object.fromEntries(entries);
}

function headersEqual(
  left: Record<string, string> | null | undefined,
  right: Record<string, string> | null | undefined
): boolean {
  const a = normalizeHeaders(left);
  const b = normalizeHeaders(right);
  if (a === null && b === null) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  const aEntries = Object.entries(a).sort(([ak], [bk]) => ak.localeCompare(bk));
  const bEntries = Object.entries(b).sort(([ak], [bk]) => ak.localeCompare(bk));
  if (aEntries.length !== bEntries.length) {
    return false;
  }
  return aEntries.every(([key, value], index) => key === bEntries[index][0] && value === bEntries[index][1]);
}

function normalizeModelList(input: string[] | null | undefined): string[] {
  if (!input || input.length === 0) {
    return [];
  }
  const deduped = new Set<string>();
  for (const item of input) {
    const trimmed = item.trim();
    if (trimmed) {
      deduped.add(trimmed);
    }
  }
  return [...deduped];
}

function stripProviderPrefix(model: string, prefix: string): string {
  const trimmed = model.trim();
  if (!trimmed || !prefix.trim()) {
    return trimmed;
  }
  const fullPrefix = `${prefix.trim()}/`;
  if (trimmed.startsWith(fullPrefix)) {
    return trimmed.slice(fullPrefix.length);
  }
  return trimmed;
}

function toProviderLocalModelId(model: string, aliases: string[]): string {
  let normalized = model.trim();
  if (!normalized) {
    return '';
  }
  for (const alias of aliases) {
    const cleanAlias = alias.trim();
    if (!cleanAlias) {
      continue;
    }
    normalized = stripProviderPrefix(normalized, cleanAlias);
  }
  return normalized.trim();
}

function modelListsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => item === right[index]);
}

function mergeModelLists(base: string[], extra: string[]): string[] {
  const merged = [...base];
  for (const item of extra) {
    if (!merged.includes(item)) {
      merged.push(item);
    }
  }
  return merged;
}

function resolveEditableModels(defaultModels: string[], savedModels: string[]): string[] {
  if (savedModels.length === 0) {
    return defaultModels;
  }
  const looksLikeLegacyCustomList = savedModels.every((model) => !defaultModels.includes(model));
  if (looksLikeLegacyCustomList) {
    return mergeModelLists(defaultModels, savedModels);
  }
  return savedModels;
}

function serializeModelsForSave(models: string[], defaultModels: string[]): string[] {
  if (modelListsEqual(models, defaultModels)) {
    return [];
  }
  return models;
}

export function ProviderForm({ providerName }: ProviderFormProps) {
  const { data: config } = useConfig();
  const { data: meta } = useConfigMeta();
  const { data: schema } = useConfigSchema();
  const updateProvider = useUpdateProvider();
  const testProviderConnection = useTestProviderConnection();

  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [extraHeaders, setExtraHeaders] = useState<Record<string, string> | null>(null);
  const [wireApi, setWireApi] = useState<WireApiType>('auto');
  const [models, setModels] = useState<string[]>([]);
  const [modelDraft, setModelDraft] = useState('');

  const providerSpec = meta?.providers.find((p) => p.name === providerName);
  const providerConfig = providerName ? config?.providers[providerName] : null;
  const uiHints = schema?.uiHints;

  const apiKeyHint = providerName ? hintForPath(`providers.${providerName}.apiKey`, uiHints) : undefined;
  const apiBaseHint = providerName ? hintForPath(`providers.${providerName}.apiBase`, uiHints) : undefined;
  const extraHeadersHint = providerName ? hintForPath(`providers.${providerName}.extraHeaders`, uiHints) : undefined;
  const wireApiHint = providerName ? hintForPath(`providers.${providerName}.wireApi`, uiHints) : undefined;

  const providerTitle = providerSpec?.displayName || providerName || t('providersSelectPlaceholder');
  const providerModelPrefix = providerSpec?.modelPrefix || providerName || '';
  const providerModelAliases = useMemo(
    () => normalizeModelList([providerModelPrefix, providerName || '']),
    [providerModelPrefix, providerName]
  );
  const defaultApiBase = providerSpec?.defaultApiBase || '';
  const currentApiBase = providerConfig?.apiBase || defaultApiBase;
  const currentHeaders = normalizeHeaders(providerConfig?.extraHeaders || null);
  const currentWireApi = (providerConfig?.wireApi || providerSpec?.defaultWireApi || 'auto') as WireApiType;
  const defaultModels = useMemo(
    () =>
      normalizeModelList(
        (providerSpec?.defaultModels ?? []).map((model) => toProviderLocalModelId(model, providerModelAliases))
      ),
    [providerSpec?.defaultModels, providerModelAliases]
  );
  const currentModels = useMemo(
    () =>
      normalizeModelList(
        (providerConfig?.models ?? []).map((model) => toProviderLocalModelId(model, providerModelAliases))
      ),
    [providerConfig?.models, providerModelAliases]
  );
  const currentEditableModels = useMemo(
    () => resolveEditableModels(defaultModels, currentModels),
    [defaultModels, currentModels]
  );

  useEffect(() => {
    if (!providerName) {
      setApiKey('');
      setApiBase('');
      setExtraHeaders(null);
      setWireApi('auto');
      setModels([]);
      setModelDraft('');
      return;
    }

    setApiKey('');
    setApiBase(currentApiBase);
    setExtraHeaders(providerConfig?.extraHeaders || null);
    setWireApi(currentWireApi);
    setModels(currentEditableModels);
    setModelDraft('');
  }, [providerName, currentApiBase, providerConfig?.extraHeaders, currentWireApi, currentEditableModels]);

  const hasChanges = useMemo(() => {
    if (!providerName) {
      return false;
    }
    const apiKeyChanged = apiKey.trim().length > 0;
    const apiBaseChanged = apiBase.trim() !== currentApiBase.trim();
    const headersChanged = !headersEqual(extraHeaders, currentHeaders);
    const wireApiChanged = providerSpec?.supportsWireApi ? wireApi !== currentWireApi : false;
    const modelsChanged = !modelListsEqual(models, currentEditableModels);

    return apiKeyChanged || apiBaseChanged || headersChanged || wireApiChanged || modelsChanged;
  }, [
    providerName,
    apiKey,
    apiBase,
    currentApiBase,
    extraHeaders,
    currentHeaders,
    providerSpec?.supportsWireApi,
    wireApi,
    currentWireApi,
    models,
    currentEditableModels
  ]);

  const resetToDefault = () => {
    setApiKey('');
    setApiBase(defaultApiBase);
    setExtraHeaders(null);
    setWireApi((providerSpec?.defaultWireApi || 'auto') as WireApiType);
    setModels(defaultModels);
    setModelDraft('');
  };

  const handleAddModel = () => {
    const next = toProviderLocalModelId(modelDraft, providerModelAliases);
    if (!next) {
      return;
    }
    if (models.includes(next)) {
      setModelDraft('');
      return;
    }
    setModels((prev) => [...prev, next]);
    setModelDraft('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerName) {
      return;
    }

    const payload: ProviderConfigUpdate = {};
    const trimmedApiKey = apiKey.trim();
    const trimmedApiBase = apiBase.trim();
    const normalizedHeaders = normalizeHeaders(extraHeaders);

    if (trimmedApiKey.length > 0) {
      payload.apiKey = trimmedApiKey;
    }

    if (trimmedApiBase !== currentApiBase.trim()) {
      payload.apiBase = trimmedApiBase.length > 0 && trimmedApiBase !== defaultApiBase ? trimmedApiBase : null;
    }

    if (!headersEqual(normalizedHeaders, currentHeaders)) {
      payload.extraHeaders = normalizedHeaders;
    }

    if (providerSpec?.supportsWireApi && wireApi !== currentWireApi) {
      payload.wireApi = wireApi;
    }
    if (!modelListsEqual(models, currentEditableModels)) {
      payload.models = serializeModelsForSave(models, defaultModels);
    }

    updateProvider.mutate({ provider: providerName, data: payload });
  };

  const handleTestConnection = async () => {
    if (!providerName) {
      return;
    }

    const payload: ProviderConnectionTestRequest = {
      apiBase: apiBase.trim(),
      extraHeaders: normalizeHeaders(extraHeaders),
      model: config?.agents.defaults.model ?? null
    };
    if (apiKey.trim().length > 0) {
      payload.apiKey = apiKey.trim();
    }
    if (providerSpec?.supportsWireApi) {
      payload.wireApi = wireApi;
    }

    try {
      const result = await testProviderConnection.mutateAsync({
        provider: providerName,
        data: payload
      });
      if (result.success) {
        toast.success(`${t('providerTestConnectionSuccess')} (${result.latencyMs}ms)`);
        return;
      }
      const details = [`provider=${result.provider}`, `latency=${result.latencyMs}ms`];
      if (result.model) {
        details.push(`model=${result.model}`);
      }
      toast.error(`${t('providerTestConnectionFailed')}: ${result.message} | ${details.join(' | ')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('providerTestConnectionFailed')}: ${message}`);
    }
  };

  if (!providerName || !providerSpec || !providerConfig) {
    return (
      <div className={CONFIG_EMPTY_DETAIL_CARD_CLASS}>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('providersSelectTitle')}</h3>
          <p className="mt-2 text-sm text-gray-500">{t('providersSelectDescription')}</p>
        </div>
      </div>
    );
  }

  const statusLabel = providerConfig.apiKeySet ? t('statusReady') : t('statusSetup');

  return (
    <div className={CONFIG_DETAIL_CARD_CLASS}>
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">{providerTitle}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('providerFormDescription')}</p>
          </div>
          <StatusDot status={providerConfig.apiKeySet ? 'ready' : 'setup'} label={statusLabel} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="space-y-2.5">
            <Label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <KeyRound className="h-3.5 w-3.5 text-gray-500" />
              {apiKeyHint?.label ?? t('apiKey')}
            </Label>
            <MaskedInput
              id="apiKey"
              value={apiKey}
              isSet={providerConfig.apiKeySet}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={providerConfig.apiKeySet ? t('apiKeySet') : apiKeyHint?.placeholder ?? t('enterApiKey')}
              className="rounded-xl"
            />
            <p className="text-xs text-gray-500">{t('leaveBlankToKeepUnchanged')}</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="apiBase" className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Globe className="h-3.5 w-3.5 text-gray-500" />
              {apiBaseHint?.label ?? t('apiBase')}
            </Label>
            <Input
              id="apiBase"
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder={defaultApiBase || apiBaseHint?.placeholder || 'https://api.example.com'}
              className="rounded-xl"
            />
            <p className="text-xs text-gray-500">{apiBaseHint?.help || t('providerApiBaseHelp')}</p>
          </div>

          {providerSpec.supportsWireApi && (
            <div className="space-y-2.5">
              <Label htmlFor="wireApi" className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Hash className="h-3.5 w-3.5 text-gray-500" />
                {wireApiHint?.label ?? t('wireApi')}
              </Label>
              <Select value={wireApi} onValueChange={(v) => setWireApi(v as WireApiType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(providerSpec.wireApiOptions || ['auto', 'chat', 'responses']).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'chat' ? t('wireApiChat') : option === 'responses' ? t('wireApiResponses') : t('wireApiAuto')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wireApiHint?.help && <p className="text-xs text-gray-500">{wireApiHint.help}</p>}
            </div>
          )}

          <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Hash className="h-3.5 w-3.5 text-gray-500" />
              {extraHeadersHint?.label ?? t('extraHeaders')}
            </Label>
            <KeyValueEditor value={extraHeaders} onChange={setExtraHeaders} />
            <p className="text-xs text-gray-500">{extraHeadersHint?.help || t('providerExtraHeadersHelp')}</p>
          </div>

          <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Sparkles className="h-3.5 w-3.5 text-gray-500" />
              {t('providerModelsTitle')}
            </Label>

            <div className="flex items-center gap-2">
              <Input
                value={modelDraft}
                onChange={(event) => setModelDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddModel();
                  }
                }}
                placeholder={t('providerModelInputPlaceholder')}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddModel} disabled={modelDraft.trim().length === 0}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('providerAddModel')}
              </Button>
            </div>

            {models.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                {t('providerModelsEmpty')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {models.map((modelName) => (
                  <div
                    key={modelName}
                    className="group inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5"
                  >
                    <span className="max-w-[180px] truncate text-sm text-gray-800 sm:max-w-[240px]">{modelName}</span>
                    <button
                      type="button"
                      onClick={() => setModels((prev) => prev.filter((name) => name !== modelName))}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      aria-label={t('remove')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">{t('providerModelsHelp')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={resetToDefault}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('resetToDefault')}
            </Button>
            <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testProviderConnection.isPending}>
              <CircleDotDashed className="mr-2 h-4 w-4" />
              {testProviderConnection.isPending ? t('providerTestingConnection') : t('providerTestConnection')}
            </Button>
          </div>
          <Button type="submit" disabled={updateProvider.isPending || !hasChanges}>
            {updateProvider.isPending ? t('saving') : hasChanges ? t('save') : t('unchanged')}
          </Button>
        </div>
      </form>
    </div>
  );
}
