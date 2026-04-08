import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsPage } from '@/components/agents/AgentsPage';
import { setLanguage } from '@/lib/i18n';

const mocks = vi.hoisted(() => ({
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  agentsQuery: {
    data: {
      agents: [
        {
          id: 'main',
          displayName: 'Main',
          description: '系统默认入口与总控协作者。',
          builtIn: true,
          model: 'openai/gpt-5.1',
          workspace: '~/.nextclaw/workspace',
          avatarUrl: null
        },
        {
          id: 'researcher',
          displayName: 'Researcher',
          description: '负责调研、信息筛选与结论提炼。',
          builtIn: false,
          model: 'openai/gpt-5.2',
          workspace: '~/.nextclaw/workspace/agents/researcher',
          avatarUrl: null
        }
      ]
    },
    isLoading: false
  },
  configQuery: {
    data: {
      agents: {
        defaults: {
          model: 'openai/gpt-5.1',
          workspace: '~/.nextclaw/workspace'
        }
      },
      providers: {
        openai: {
          enabled: true,
          apiKeySet: true,
          models: ['gpt-5.1', 'gpt-5.2']
        }
      }
    }
  },
  configMetaQuery: {
    data: {
      providers: [
        {
          name: 'openai',
          displayName: 'OpenAI',
          modelPrefix: 'openai',
          defaultModels: ['openai/gpt-5.1', 'openai/gpt-5.2'],
          keywords: [],
          envKey: 'OPENAI_API_KEY'
        }
      ]
    }
  }
}));

vi.mock('@/hooks/agents/useAgents', () => ({
  useAgents: () => mocks.agentsQuery,
  useCreateAgent: () => ({
    mutateAsync: mocks.createAgent,
    isPending: false
  }),
  useUpdateAgent: () => ({
    mutateAsync: mocks.updateAgent,
    isPending: false
  }),
  useDeleteAgent: () => ({
    mutate: mocks.deleteAgent,
    isPending: false
  })
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => mocks.configQuery,
  useConfigMeta: () => mocks.configMetaQuery
}));

describe('AgentsPage', () => {
  beforeEach(() => {
    setLanguage('zh');
    mocks.createAgent.mockReset();
    mocks.updateAgent.mockReset();
    mocks.deleteAgent.mockReset();
  });

  it('renders the agents workspace in Chinese and keeps core actions visible', async () => {
    const user = userEvent.setup();

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
    expect(screen.getAllByRole('button', { name: '编辑' })).toHaveLength(2);
    expect(screen.getByText('负责调研、信息筛选与结论提炼。')).toBeTruthy();
    expect(screen.queryByText('专属 Agent 身份，可沉淀自己的记忆、技能与角色风格。')).toBeNull();
    expect(screen.queryByText('Agent Gallery')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: '编辑' })[1]);

    expect(screen.getByText('编辑 Agent 身份')).toBeTruthy();
    expect(screen.getByText('主目录保持不变')).toBeTruthy();
    expect(screen.getByDisplayValue('Researcher')).toBeTruthy();
    expect(screen.getByDisplayValue('gpt-5.2')).toBeTruthy();
  });
});
