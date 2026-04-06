import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsPage } from '@/components/agents/AgentsPage';
import { setLanguage } from '@/lib/i18n';

const mocks = vi.hoisted(() => ({
  createAgent: vi.fn(),
  deleteAgent: vi.fn(),
  agentsQuery: {
    data: {
      agents: [
        {
          id: 'main',
          displayName: 'Main',
          description: '系统默认入口与总控协作者。',
          builtIn: true,
          workspace: '~/.nextclaw/workspace',
          avatarUrl: null
        },
        {
          id: 'researcher',
          displayName: 'Researcher',
          description: '负责调研、信息筛选与结论提炼。',
          builtIn: false,
          workspace: '~/.nextclaw/workspace/agents/researcher',
          avatarUrl: null
        }
      ]
    },
    isLoading: false
  }
}));

vi.mock('@/hooks/agents/useAgents', () => ({
  useAgents: () => mocks.agentsQuery,
  useCreateAgent: () => ({
    mutateAsync: mocks.createAgent,
    isPending: false
  }),
  useDeleteAgent: () => ({
    mutate: mocks.deleteAgent,
    isPending: false
  })
}));

describe('AgentsPage', () => {
  beforeEach(() => {
    setLanguage('zh');
    mocks.createAgent.mockReset();
    mocks.deleteAgent.mockReset();
  });

  it('renders the agents workspace in Chinese and keeps core actions visible', () => {
    render(
      <MemoryRouter>
        <AgentsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Agent 管理台')).toBeTruthy();
    expect(screen.getByText('让每个 Agent 都像真正的协作者一样存在')).toBeTruthy();
    expect(screen.getByText('全部 Agent')).toBeTruthy();
    expect(screen.getAllByText('主目录').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '开始对话' })).toHaveLength(2);
    expect(screen.getByText('负责调研、信息筛选与结论提炼。')).toBeTruthy();
    expect(screen.queryByText('专属 Agent 身份，可沉淀自己的记忆、技能与角色风格。')).toBeNull();
    expect(screen.queryByText('Agent Gallery')).toBeNull();
  });
});
