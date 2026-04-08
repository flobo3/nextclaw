import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, KeyRound, Search as SearchIcon } from 'lucide-react';
import { PageHeader, PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfig, useConfigMeta, useUpdateSearch } from '@/hooks/useConfig';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CONFIG_DETAIL_CARD_CLASS, CONFIG_SIDEBAR_CARD_CLASS, CONFIG_SPLIT_GRID_CLASS } from './config-layout';
import type { SearchConfigUpdate, SearchProviderName, TavilySearchDepthValue } from '@/api/types';

const FRESHNESS_OPTIONS = [
  { value: 'noLimit', label: 'searchFreshnessNoLimit' },
  { value: 'oneDay', label: 'searchFreshnessOneDay' },
  { value: 'oneWeek', label: 'searchFreshnessOneWeek' },
  { value: 'oneMonth', label: 'searchFreshnessOneMonth' },
  { value: 'oneYear', label: 'searchFreshnessOneYear' }
] as const;

const SEARCH_DEPTH_OPTIONS = [
  { value: 'basic', label: 'searchDepthBasic' },
  { value: 'advanced', label: 'searchDepthAdvanced' }
] as const;

const SEARCH_PROVIDER_DESCRIPTION_KEYS: Record<SearchProviderName, string> = {
  bocha: 'searchProviderBochaDescription',
  tavily: 'searchProviderTavilyDescription',
  brave: 'searchProviderBraveDescription'
};

type BochaProviderFieldsProps = {
  apiKey: string;
  apiKeyMasked?: string;
  baseUrl: string;
  summary: boolean;
  freshness: string;
  docsUrl?: string;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onSummaryChange: (value: boolean) => void;
  onFreshnessChange: (value: string) => void;
};

function BochaProviderFields({
  apiKey,
  apiKeyMasked,
  baseUrl,
  summary,
  freshness,
  docsUrl,
  onApiKeyChange,
  onBaseUrlChange,
  onSummaryChange,
  onFreshnessChange
}: BochaProviderFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('apiKey')}</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={apiKeyMasked || t('enterApiKey')}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('searchProviderBaseUrl')}</Label>
        <Input value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} className="rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('searchProviderSummary')}</Label>
          <Select value={summary ? 'true' : 'false'} onValueChange={(value) => onSummaryChange(value === 'true')}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t('enabled')}</SelectItem>
              <SelectItem value="false">{t('disabled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('searchProviderFreshness')}</Label>
          <Select value={freshness} onValueChange={onFreshnessChange}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRESHNESS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <a href={docsUrl ?? 'https://open.bocha.cn'} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" className="rounded-xl">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('searchProviderOpenDocs')}
          </Button>
        </a>
      </div>
    </div>
  );
}

type TavilyProviderFieldsProps = {
  apiKey: string;
  apiKeyMasked?: string;
  baseUrl: string;
  searchDepth: TavilySearchDepthValue;
  includeAnswer: boolean;
  docsUrl?: string;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onSearchDepthChange: (value: TavilySearchDepthValue) => void;
  onIncludeAnswerChange: (value: boolean) => void;
};

function TavilyProviderFields({
  apiKey,
  apiKeyMasked,
  baseUrl,
  searchDepth,
  includeAnswer,
  docsUrl,
  onApiKeyChange,
  onBaseUrlChange,
  onSearchDepthChange,
  onIncludeAnswerChange
}: TavilyProviderFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('apiKey')}</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={apiKeyMasked || t('enterApiKey')}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('searchProviderBaseUrl')}</Label>
        <Input value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} className="rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('searchProviderSearchDepth')}</Label>
          <Select value={searchDepth} onValueChange={(value) => onSearchDepthChange(value as TavilySearchDepthValue)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_DEPTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('searchProviderIncludeAnswer')}</Label>
          <Select value={includeAnswer ? 'true' : 'false'} onValueChange={(value) => onIncludeAnswerChange(value === 'true')}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t('enabled')}</SelectItem>
              <SelectItem value="false">{t('disabled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {docsUrl ? (
        <div className="space-y-2">
          <a href={docsUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" className="rounded-xl">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('searchProviderOpenDocs')}
            </Button>
          </a>
        </div>
      ) : null}
    </div>
  );
}

type BraveProviderFieldsProps = {
  apiKey: string;
  apiKeyMasked?: string;
  baseUrl: string;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
};

function BraveProviderFields({
  apiKey,
  apiKeyMasked,
  baseUrl,
  onApiKeyChange,
  onBaseUrlChange
}: BraveProviderFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('apiKey')}</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder={apiKeyMasked || t('enterApiKey')}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('searchProviderBaseUrl')}</Label>
        <Input value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} className="rounded-xl" />
      </div>
    </div>
  );
}

export function SearchConfig() {
  const { data: config } = useConfig();
  const { data: meta } = useConfigMeta();
  const updateSearch = useUpdateSearch();
  const providers = useMemo(() => meta?.search ?? [], [meta]);
  const search = config?.search;

  const [selectedProvider, setSelectedProvider] = useState<SearchProviderName>('bocha');
  const [activeProvider, setActiveProvider] = useState<SearchProviderName>('bocha');
  const [enabledProviders, setEnabledProviders] = useState<SearchProviderName[]>(['bocha']);
  const [maxResults, setMaxResults] = useState('10');
  const [bochaApiKey, setBochaApiKey] = useState('');
  const [bochaBaseUrl, setBochaBaseUrl] = useState('https://api.bocha.cn/v1/web-search');
  const [bochaSummary, setBochaSummary] = useState(true);
  const [bochaFreshness, setBochaFreshness] = useState('noLimit');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [tavilyBaseUrl, setTavilyBaseUrl] = useState('https://api.tavily.com/search');
  const [tavilySearchDepth, setTavilySearchDepth] = useState<TavilySearchDepthValue>('basic');
  const [tavilyIncludeAnswer, setTavilyIncludeAnswer] = useState(false);
  const [braveApiKey, setBraveApiKey] = useState('');
  const [braveBaseUrl, setBraveBaseUrl] = useState('https://api.search.brave.com/res/v1/web/search');

  useEffect(() => {
    if (!search) {
      return;
    }
    setSelectedProvider(search.provider);
    setActiveProvider(search.provider);
    setEnabledProviders(search.enabledProviders);
    setMaxResults(String(search.defaults.maxResults));
    setBochaBaseUrl(search.providers.bocha.baseUrl);
    setBochaSummary(Boolean(search.providers.bocha.summary));
    setBochaFreshness(search.providers.bocha.freshness ?? 'noLimit');
    setTavilyBaseUrl(search.providers.tavily.baseUrl);
    setTavilySearchDepth(search.providers.tavily.searchDepth ?? 'basic');
    setTavilyIncludeAnswer(Boolean(search.providers.tavily.includeAnswer));
    setBraveBaseUrl(search.providers.brave.baseUrl);
  }, [search]);

  const selectedMeta = useMemo(
    () => providers.find((provider) => provider.name === selectedProvider),
    [providers, selectedProvider]
  );
  const selectedView = search?.providers[selectedProvider];
  const selectedEnabled = enabledProviders.includes(selectedProvider);
  const selectedDocsUrl = selectedView?.docsUrl ?? selectedMeta?.docsUrl;
  const activationButtonLabel = selectedEnabled
    ? t('searchProviderDeactivate')
    : t('searchProviderActivate');

  const buildSearchPayload = (
    nextEnabledProviders: SearchProviderName[] = enabledProviders,
    nextActiveProvider: SearchProviderName = activeProvider
  ): SearchConfigUpdate => ({
    provider: nextActiveProvider,
    enabledProviders: nextEnabledProviders,
    defaults: {
      maxResults: Number(maxResults) || 10
    },
    providers: {
      bocha: {
        apiKey: bochaApiKey || undefined,
        baseUrl: bochaBaseUrl,
        summary: bochaSummary,
        freshness: bochaFreshness
      },
      tavily: {
        apiKey: tavilyApiKey || undefined,
        baseUrl: tavilyBaseUrl,
        searchDepth: tavilySearchDepth,
        includeAnswer: tavilyIncludeAnswer
      },
      brave: {
        apiKey: braveApiKey || undefined,
        baseUrl: braveBaseUrl
      }
    }
  });

  const handleToggleEnabled = () => {
    const nextEnabledProviders = selectedEnabled
      ? enabledProviders.filter((provider) => provider !== selectedProvider)
      : [...enabledProviders, selectedProvider];
    setEnabledProviders(nextEnabledProviders);
    updateSearch.mutate({
      data: buildSearchPayload(nextEnabledProviders)
    });
  };

  const handleActiveProviderChange = (value: string) => {
    setActiveProvider(value as SearchProviderName);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateSearch.mutate({
      data: buildSearchPayload()
    });
  };

  if (!search || providers.length === 0) {
    return <div className="p-8">{t('loading')}</div>;
  }

  return (
    <PageLayout>
      <PageHeader title={t('searchPageTitle')} description={t('searchPageDescription')} />

      <div className={CONFIG_SPLIT_GRID_CLASS}>
        <section className={CONFIG_SIDEBAR_CARD_CLASS}>
          <div className="border-b border-gray-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{t('searchChannels')}</p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {providers.map((provider) => {
              const providerView = search.providers[provider.name];
              const isEnabled = enabledProviders.includes(provider.name);
              const isSelected = selectedProvider === provider.name;
              return (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() => setSelectedProvider(provider.name)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-all',
                    isSelected
                      ? 'border-primary/30 bg-primary-50/40 shadow-sm'
                      : 'border-gray-200/70 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{provider.displayName}</p>
                      <p className="line-clamp-2 text-[11px] text-gray-500">
                        {t(SEARCH_PROVIDER_DESCRIPTION_KEYS[provider.name])}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {providerView.apiKeySet ? t('searchStatusConfigured') : t('searchStatusNeedsSetup')}
                      </span>
                      {isEnabled ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {t('searchProviderActivated')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <form onSubmit={handleSubmit} className={cn(CONFIG_DETAIL_CARD_CLASS, 'p-6')}>
          {!selectedMeta || !selectedView ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('searchNoProviderSelected')}</div>
          ) : (
            <div className="space-y-6 overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                    <SearchIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedMeta.displayName}</h3>
                    <p className="text-sm text-gray-500">{selectedMeta.description}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={selectedEnabled ? 'secondary' : 'outline'}
                  className="rounded-xl"
                  onClick={handleToggleEnabled}
                >
                  {activationButtonLabel}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('searchActiveProvider')}</Label>
                  <Select value={activeProvider} onValueChange={handleActiveProviderChange}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.name} value={provider.name}>{provider.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('searchDefaultMaxResults')}</Label>
                  <Input
                    value={maxResults}
                    onChange={(event) => setMaxResults(event.target.value)}
                    inputMode="numeric"
                    className="rounded-xl"
                  />
                </div>
              </div>

              {selectedProvider === 'bocha' ? (
                <BochaProviderFields
                  apiKey={bochaApiKey}
                  apiKeyMasked={search.providers.bocha.apiKeyMasked}
                  baseUrl={bochaBaseUrl}
                  summary={bochaSummary}
                  freshness={bochaFreshness}
                  docsUrl={selectedDocsUrl}
                  onApiKeyChange={setBochaApiKey}
                  onBaseUrlChange={setBochaBaseUrl}
                  onSummaryChange={setBochaSummary}
                  onFreshnessChange={setBochaFreshness}
                />
              ) : selectedProvider === 'tavily' ? (
                <TavilyProviderFields
                  apiKey={tavilyApiKey}
                  apiKeyMasked={search.providers.tavily.apiKeyMasked}
                  baseUrl={tavilyBaseUrl}
                  searchDepth={tavilySearchDepth}
                  includeAnswer={tavilyIncludeAnswer}
                  docsUrl={selectedDocsUrl}
                  onApiKeyChange={setTavilyApiKey}
                  onBaseUrlChange={setTavilyBaseUrl}
                  onSearchDepthChange={setTavilySearchDepth}
                  onIncludeAnswerChange={setTavilyIncludeAnswer}
                />
              ) : (
                <BraveProviderFields
                  apiKey={braveApiKey}
                  apiKeyMasked={search.providers.brave.apiKeyMasked}
                  baseUrl={braveBaseUrl}
                  onApiKeyChange={setBraveApiKey}
                  onBaseUrlChange={setBraveBaseUrl}
                />
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={updateSearch.isPending}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {updateSearch.isPending ? t('saving') : t('saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </PageLayout>
  );
}
