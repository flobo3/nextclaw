export const RUNTIME_CONTROL_LABELS: Record<string, { zh: string; en: string }> = {
  runtimePageTitle: { zh: '路由与运行时', en: 'Routing & Runtime' },
  runtimePageDescription: {
    zh: '对齐 OpenClaw 的多 Agent 路由：绑定规则、Agent 池、私聊范围。',
    en: 'Align multi-agent routing with OpenClaw: bindings, agent pool, and DM scope.'
  },
  runtimeLoading: { zh: '加载运行时配置中...', en: 'Loading runtime settings...' },
  runtimeControlTitle: { zh: '运行时控制', en: 'Runtime Control' },
  runtimeControlDescription: {
    zh: '需要时可从前端主动重启 NextClaw 运行时。桌面端额外支持重启整个应用。',
    en: 'Restart the NextClaw runtime from the UI when needed. Desktop also supports restarting the whole app.'
  },
  runtimeControlLoading: { zh: '读取运行时控制能力中...', en: 'Loading runtime control capabilities...' },
  runtimeControlLoadFailed: { zh: '读取运行时控制状态失败', en: 'Failed to load runtime control state' },
  runtimeControlHealthy: { zh: '运行时正常', en: 'Runtime healthy' },
  runtimeControlRestartingService: { zh: '正在重启服务', en: 'Restarting service' },
  runtimeControlRestartingApp: { zh: '正在重启应用', en: 'Restarting app' },
  runtimeControlRecovering: { zh: '正在恢复连接', en: 'Recovering connection' },
  runtimeControlFailed: { zh: '重启失败', en: 'Restart failed' },
  runtimeControlUnavailable: { zh: '当前不可用', en: 'Currently unavailable' },
  runtimeControlEnvironmentDesktop: { zh: '桌面端内嵌运行时', en: 'Desktop embedded runtime' },
  runtimeControlEnvironmentManagedService: { zh: '本地托管服务', en: 'Managed local service' },
  runtimeControlEnvironmentSelfHosted: { zh: '自托管网页端', en: 'Self-hosted web' },
  runtimeControlEnvironmentSharedWeb: { zh: '共享网页端', en: 'Shared web' },
  runtimeControlRestartService: { zh: '重启服务', en: 'Restart Service' },
  runtimeControlRestartApp: { zh: '重启应用', en: 'Restart App' },
  runtimeControlRestartingServiceHelp: {
    zh: '正在重启 NextClaw 服务，页面可能会短暂断开。',
    en: 'Restarting the NextClaw service. The page may disconnect briefly.'
  },
  runtimeControlRestartingAppHelp: {
    zh: '正在重新启动桌面应用，当前窗口会短暂关闭并立即拉起。',
    en: 'Restarting the desktop app. The current window will close briefly and relaunch.'
  },
  runtimeControlRecoveringHelp: {
    zh: '正在等待服务恢复连接...',
    en: 'Waiting for the service to come back...'
  },
  runtimeControlRecovered: { zh: '运行时已恢复连接', en: 'Runtime connection restored' },
  runtimeControlRestartFailed: { zh: '运行时重启失败', en: 'Runtime restart failed' },
  runtimeControlRestartAppConfirm: {
    zh: '这会重启整个 NextClaw 桌面应用，并中断当前窗口。确定继续吗？',
    en: 'This restarts the entire NextClaw desktop app and interrupts the current window. Continue?'
  },
  runtimeRestartAppUnavailable: {
    zh: '当前环境不支持从前端重启整个应用。',
    en: 'This environment does not support restarting the entire app from the UI.'
  },
  runtimeRecoveryTimedOut: {
    zh: '等待运行时恢复超时，请稍后重试或查看日志。',
    en: 'Timed out waiting for the runtime to recover. Try again or inspect the logs.'
  }
};
