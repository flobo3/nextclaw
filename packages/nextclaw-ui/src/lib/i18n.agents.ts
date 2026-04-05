export const AGENT_LABELS: Record<string, { zh: string; en: string }> = {
  agentsPageTitle: { zh: 'Agents', en: 'Agents' },
  agentsPageDescription: {
    zh: '管理可对话的 Agent identity。每个 Agent 都绑定自己的 Home Directory、设定、记忆与技能。',
    en: 'Manage conversational agent identities. Each agent owns its home directory, setup, memory, and skills.'
  },
  agentsHeroEyebrow: { zh: 'Agent Gallery', en: 'Agent Gallery' },
  agentsHeroTitle: {
    zh: '让每个 Agent 像一个真正的协作者一样存在',
    en: 'Give every agent the presence of a real collaborator'
  },
  agentsHeroDescription: {
    zh: '在这里浏览、创建并挑选不同的 Agent identity。每个 Agent 都有自己的头像、名字、Home Directory，以及属于自己的记忆与技能空间。',
    en: 'Browse, create, and choose distinct agent identities. Every agent carries its own avatar, name, home directory, memory, and skills space.'
  },
  agentsCreateButton: { zh: '新增 Agent', en: 'New Agent' },
  agentsCreateDialogTitle: { zh: '创建新的 Agent identity', en: 'Create a new agent identity' },
  agentsCreateDialogDescription: {
    zh: '默认逻辑保持简单。只填必要信息，其余能力继续走统一配置与 Home Directory 模板。',
    en: 'Keep the flow simple. Provide only the essentials and let shared defaults plus the home directory template do the rest.'
  },
  agentsCreateDialogHint: {
    zh: '如果你希望让 AI 自动完成全部自定义，也可以继续使用 `nextclaw agents new`。',
    en: 'If you want AI to automate the full setup, you can still use `nextclaw agents new`.'
  },
  agentsCreateTitle: { zh: '创建 Agent', en: 'Create Agent' },
  agentsCreateDescription: {
    zh: '这里提供轻量入口。完整自动化创建链路也可通过 `nextclaw agents new` 使用。',
    en: 'This is the lightweight UI entry. The full automation path is also available through `nextclaw agents new`.'
  },
  agentsFormIdPlaceholder: { zh: 'Agent ID，例如 engineer', en: 'Agent ID, for example engineer' },
  agentsFormNamePlaceholder: { zh: '显示名称，可选', en: 'Display name, optional' },
  agentsFormAvatarPlaceholder: { zh: '头像 URL 或本地路径，可选', en: 'Avatar URL or local path, optional' },
  agentsFormHomePlaceholder: { zh: 'Home Directory，可选', en: 'Home Directory, optional' },
  agentsCreateAction: { zh: '创建 Agent', en: 'Create Agent' },
  agentsRemoveAction: { zh: '移除', en: 'Remove' },
  agentsNewChat: { zh: '新建会话', en: 'New Chat' },
  agentsLoading: { zh: '正在加载 Agent...', en: 'Loading agents...' },
  agentsEmpty: { zh: '当前还没有附加 Agent', en: 'No extra agents yet' },
  agentsEmptyDescription: {
    zh: '先创建第一个专职 Agent，让它拥有自己的名字、头像与 Home Directory。',
    en: 'Create the first specialist agent with its own name, avatar, and home directory.'
  },
  agentsBuiltIn: { zh: '内建', en: 'Built-in' },
  agentsCustom: { zh: '自定义', en: 'Custom' },
  agentsOverviewTotal: { zh: '可对话 Agent', en: 'Conversational agents' },
  agentsOverviewBuiltIn: { zh: '系统主 Agent', en: 'System main agents' },
  agentsOverviewCustom: { zh: '专职 Agent', en: 'Specialist agents' },
  agentsCardBuiltInSummary: {
    zh: '系统主 Agent，适合作为默认入口与总控协作者。',
    en: 'The built-in main agent, ideal as the default entry and coordinating collaborator.'
  },
  agentsCardCustomSummary: {
    zh: '专属 identity，可沉淀自己的记忆、技能与角色风格。',
    en: 'A dedicated identity with its own memory, skills, and role style.'
  },
  agentsCardHomeLabel: { zh: 'Home Directory', en: 'Home Directory' },
  agentsCardAvatarLabel: { zh: 'Avatar', en: 'Avatar' },
  agentsCardStartChat: { zh: '进入对话', en: 'Start Chat' },
  agentsCardBuiltInTag: { zh: '主 Agent', en: 'Main Agent' },
  agentsCardCustomTag: { zh: '专职', en: 'Specialist' },
  chatDraftAgentTitle: { zh: '本次会话将与谁对话？', en: 'Who should this draft chat talk to?' },
  chatDraftAgentDescription: { zh: '草稿态可以选择 Agent；会话创建后不可切换。', en: 'Choose the agent in draft state. It cannot be changed after the session is created.' },
  chatDraftAgentCurrent: { zh: '当前 Agent', en: 'Current Agent' }
};
