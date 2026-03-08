import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmRechargeIntent,
  fetchAdminOverview,
  fetchAdminRechargeIntents,
  fetchAdminUsers,
  rejectRechargeIntent,
  updateAdminUser,
  updateGlobalFreeLimit
} from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableWrap } from '@/components/ui/table';
import { formatUsd } from '@/lib/utils';

type Props = {
  token: string;
};

export function AdminDashboardPage({ token }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const [globalLimitInput, setGlobalLimitInput] = useState('20');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userCursor, setUserCursor] = useState<string | null>(null);
  const [userCursorHistory, setUserCursorHistory] = useState<Array<string | null>>([]);
  const [intentStatus, setIntentStatus] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');
  const [intentCursor, setIntentCursor] = useState<string | null>(null);
  const [intentCursorHistory, setIntentCursorHistory] = useState<Array<string | null>>([]);
  const [freeLimitDrafts, setFreeLimitDrafts] = useState<Record<string, string>>({});
  const [paidDeltaDrafts, setPaidDeltaDrafts] = useState<Record<string, string>>({});
  const pageSize = 20;

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => await fetchAdminOverview(token)
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', userSearch, userCursor],
    queryFn: async () => await fetchAdminUsers(token, { limit: pageSize, q: userSearch, cursor: userCursor })
  });

  const intentsQuery = useQuery({
    queryKey: ['admin-intents', intentStatus, intentCursor],
    queryFn: async () => await fetchAdminRechargeIntents(token, { limit: pageSize, status: intentStatus, cursor: intentCursor })
  });

  const setGlobalLimitMutation = useMutation({
    mutationFn: async () => {
      await updateGlobalFreeLimit(token, Number(globalLimitInput));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    }
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async (payload: { userId: string; freeLimitUsd?: number; paidBalanceDeltaUsd?: number }) => {
      await updateAdminUser(token, payload.userId, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      ]);
    }
  });

  const confirmIntentMutation = useMutation({
    mutationFn: async (intentId: string) => {
      await confirmRechargeIntent(token, intentId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-intents'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
      ]);
    }
  });

  const rejectIntentMutation = useMutation({
    mutationFn: async (intentId: string) => {
      await rejectRechargeIntent(token, intentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-intents'] });
    }
  });

  useEffect(() => {
    const users = usersQuery.data?.items ?? [];
    if (users.length === 0) {
      return;
    }
    setFreeLimitDrafts((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (!(user.id in next)) {
          next[user.id] = String(user.freeLimitUsd);
        }
      }
      return next;
    });
    setPaidDeltaDrafts((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (!(user.id in next)) {
          next[user.id] = '0';
        }
      }
      return next;
    });
  }, [usersQuery.data]);

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <CardTitle>平台总览</CardTitle>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">全局免费池上限</p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(overviewQuery.data?.globalFreeLimitUsd ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">全局免费池已消耗</p>
            <p className="mt-1 text-lg font-semibold">{formatUsd(overviewQuery.data?.globalFreeUsedUsd ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">用户数</p>
            <p className="mt-1 text-lg font-semibold">{overviewQuery.data?.userCount ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">待审核充值</p>
            <p className="mt-1 text-lg font-semibold">{overviewQuery.data?.pendingRechargeIntents ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[220px_160px]">
          <Input value={globalLimitInput} onChange={(event) => setGlobalLimitInput(event.target.value)} placeholder="设置新全局免费池上限" />
          <Button onClick={() => setGlobalLimitMutation.mutate()} disabled={setGlobalLimitMutation.isPending}>更新上限</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>用户额度管理（免费额度 + 付费余额）</CardTitle>
        <p className="text-sm text-slate-500">支持按用户调整个人免费额度上限，以及直接增减付费余额（USD）。</p>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setUserSearch(userSearchInput.trim());
            setUserCursor(null);
            setUserCursorHistory([]);
          }}
        >
          <Input
            className="max-w-sm"
            placeholder="按邮箱搜索"
            value={userSearchInput}
            onChange={(event) => setUserSearchInput(event.target.value)}
          />
          <Button type="submit" variant="secondary">搜索</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setUserSearchInput('');
              setUserSearch('');
              setUserCursor(null);
              setUserCursorHistory([]);
            }}
          >
            清空
          </Button>
        </form>
        <TableWrap>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">邮箱</th>
                <th className="px-3 py-2">角色</th>
                <th className="px-3 py-2">免费上限</th>
                <th className="px-3 py-2">免费剩余</th>
                <th className="px-3 py-2">付费余额</th>
                <th className="px-3 py-2">余额增减</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data?.items ?? []).map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">{user.role}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-28"
                      value={freeLimitDrafts[user.id] ?? String(user.freeLimitUsd)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFreeLimitDrafts((prev) => ({ ...prev, [user.id]: value }));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{formatUsd(user.freeRemainingUsd)}</td>
                  <td className="px-3 py-2">{formatUsd(user.paidBalanceUsd)}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-28"
                      placeholder="如 10 / -5"
                      value={paidDeltaDrafts[user.id] ?? '0'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPaidDeltaDrafts((prev) => ({ ...prev, [user.id]: value }));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      variant="secondary"
                      className="h-8 px-2"
                      onClick={() => {
                        const freeLimitRaw = Number(freeLimitDrafts[user.id] ?? String(user.freeLimitUsd));
                        const paidDeltaRaw = Number(paidDeltaDrafts[user.id] ?? '0');
                        const payload: { userId: string; freeLimitUsd?: number; paidBalanceDeltaUsd?: number } = {
                          userId: user.id
                        };
                        if (Number.isFinite(freeLimitRaw) && freeLimitRaw >= 0) {
                          payload.freeLimitUsd = freeLimitRaw;
                        }
                        if (Number.isFinite(paidDeltaRaw) && paidDeltaRaw !== 0) {
                          payload.paidBalanceDeltaUsd = paidDeltaRaw;
                        }
                        updateQuotaMutation.mutate(payload, {
                          onSuccess: () => {
                            setPaidDeltaDrafts((prev) => ({ ...prev, [user.id]: '0' }));
                          }
                        });
                      }}
                    >
                      保存
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {updateQuotaMutation.error ? (
          <p className="text-sm text-rose-600">
            {updateQuotaMutation.error instanceof Error ? updateQuotaMutation.error.message : '更新失败'}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3"
            disabled={userCursorHistory.length === 0}
            onClick={() => {
              const previous = userCursorHistory[userCursorHistory.length - 1] ?? null;
              setUserCursor(previous);
              setUserCursorHistory((prev) => prev.slice(0, -1));
            }}
          >
            上一页
          </Button>
          <Button
            variant="secondary"
            className="h-8 px-3"
            disabled={!usersQuery.data?.hasMore || !usersQuery.data.nextCursor}
            onClick={() => {
              setUserCursorHistory((prev) => [...prev, userCursor]);
              setUserCursor(usersQuery.data?.nextCursor ?? null);
            }}
          >
            下一页
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>充值审核</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={intentStatus === 'pending' ? 'secondary' : 'ghost'}
            className="h-8 px-3"
            onClick={() => {
              setIntentStatus('pending');
              setIntentCursor(null);
              setIntentCursorHistory([]);
            }}
          >
            待处理
          </Button>
          <Button
            variant={intentStatus === 'all' ? 'secondary' : 'ghost'}
            className="h-8 px-3"
            onClick={() => {
              setIntentStatus('all');
              setIntentCursor(null);
              setIntentCursorHistory([]);
            }}
          >
            全部
          </Button>
        </div>
        <TableWrap>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">申请时间</th>
                <th className="px-3 py-2">用户</th>
                <th className="px-3 py-2">金额</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(intentsQuery.data?.items ?? []).map((intent) => (
                <tr key={intent.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{new Date(intent.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{intent.userId}</td>
                  <td className="px-3 py-2">{formatUsd(intent.amountUsd)}</td>
                  <td className="px-3 py-2">{intent.status}</td>
                  <td className="px-3 py-2">
                    {intent.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button className="h-8 px-2" onClick={() => confirmIntentMutation.mutate(intent.id)}>通过</Button>
                        <Button variant="danger" className="h-8 px-2" onClick={() => rejectIntentMutation.mutate(intent.id)}>拒绝</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">已处理</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3"
            disabled={intentCursorHistory.length === 0}
            onClick={() => {
              const previous = intentCursorHistory[intentCursorHistory.length - 1] ?? null;
              setIntentCursor(previous);
              setIntentCursorHistory((prev) => prev.slice(0, -1));
            }}
          >
            上一页
          </Button>
          <Button
            variant="secondary"
            className="h-8 px-3"
            disabled={!intentsQuery.data?.hasMore || !intentsQuery.data.nextCursor}
            onClick={() => {
              setIntentCursorHistory((prev) => [...prev, intentCursor]);
              setIntentCursor(intentsQuery.data?.nextCursor ?? null);
            }}
          >
            下一页
          </Button>
        </div>
      </Card>
    </div>
  );
}
