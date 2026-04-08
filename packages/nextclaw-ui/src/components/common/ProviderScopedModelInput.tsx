import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableModelInput } from '@/components/common/SearchableModelInput';
import type { ProviderModelCatalogItem } from '@/lib/provider-models';
import { composeProviderModel, findProviderByModel, toProviderLocalModel } from '@/lib/provider-models';
import { t } from '@/lib/i18n';

type ProviderScopedModelInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  providerCatalog: ProviderModelCatalogItem[];
  disabled?: boolean;
  providerPlaceholder?: string;
  modelPlaceholder?: string;
  className?: string;
};

function normalizeModelOptions(options: string[]): string[] {
  const deduped = new Set<string>();
  for (const option of options) {
    const trimmed = option.trim();
    if (trimmed) {
      deduped.add(trimmed);
    }
  }
  return [...deduped];
}

export function ProviderScopedModelInput({
  id,
  value,
  onChange,
  providerCatalog,
  disabled = false,
  providerPlaceholder,
  modelPlaceholder,
  className
}: ProviderScopedModelInputProps) {
  const [providerName, setProviderName] = useState('');
  const [modelId, setModelId] = useState('');

  const providerMap = useMemo(
    () => new Map(providerCatalog.map((provider) => [provider.name, provider])),
    [providerCatalog]
  );

  const selectedProvider = providerMap.get(providerName);
  const selectedProviderAliases = useMemo(() => selectedProvider?.aliases ?? [], [selectedProvider]);
  const selectedProviderModels = useMemo(
    () => normalizeModelOptions(selectedProvider?.models ?? []),
    [selectedProvider]
  );

  useEffect(() => {
    const currentModel = value.trim();
    const matchedProvider = findProviderByModel(currentModel, providerCatalog);
    const effectiveProvider = matchedProvider ?? '';
    const aliases = providerMap.get(effectiveProvider)?.aliases ?? [];
    setProviderName(effectiveProvider);
    setModelId(effectiveProvider ? toProviderLocalModel(currentModel, aliases) : currentModel);
  }, [providerCatalog, providerMap, value]);

  const handleProviderChange = (nextProvider: string) => {
    setProviderName(nextProvider);
    setModelId('');
    onChange('');
  };

  const handleModelChange = (nextModelId: string) => {
    if (!selectedProvider) {
      const trimmed = nextModelId.trim();
      setModelId(trimmed);
      onChange(trimmed);
      return;
    }
    const normalizedLocalModel = toProviderLocalModel(nextModelId, selectedProviderAliases);
    setModelId(normalizedLocalModel);
    onChange(normalizedLocalModel ? composeProviderModel(selectedProvider.prefix, normalizedLocalModel) : '');
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:w-[38%] sm:min-w-[170px]">
          <Select value={providerName} onValueChange={handleProviderChange} disabled={disabled}>
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue placeholder={providerPlaceholder ?? t('providersSelectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {providerCatalog.map((provider) => (
                <SelectItem key={provider.name} value={provider.name}>
                  {provider.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="hidden h-10 items-center justify-center leading-none text-lg font-semibold text-gray-300 sm:inline-flex">
          /
        </span>
        <SearchableModelInput
          key={providerName}
          id={id}
          value={modelId}
          onChange={handleModelChange}
          options={selectedProviderModels}
          disabled={disabled || !providerName}
          placeholder={modelPlaceholder}
          className="sm:flex-1"
          inputClassName="h-10 rounded-xl"
          emptyText={t('modelPickerNoOptions')}
          createText={t('modelPickerUseCustom')}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">{t('modelInputCustomHint')}</p>
    </div>
  );
}
