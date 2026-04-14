import type {
  ChangeLogEntry,
  LeaderboardMethodology
} from "../shared/competitive-leaderboard.types.js";

export const LEADERBOARD_GENERATED_AT = "2026-04-14T18:30:00+08:00";

export const LEADERBOARD_METHODOLOGY_VERSION = "2026.04.14-evidence-reset";

export const DISCLOSURES: string[] = [
  "This index is maintained by the NextClaw team. NextClaw is one of the evaluated products.",
  "Only core comparable products enter the unified overall ranking.",
  "All inclusion and capability statements in this app are derived from official public sources checked on 2026-04-14.",
  "When public evidence is weak or the product category is materially different, the product stays in adjacent/watch instead of being forced into the same total ranking."
];

export const METHODOLOGY: LeaderboardMethodology = {
  definition:
    "这里的“龙虾类产品”不是所有 AI 应用，而是以个人 AI 助手、个人 AI OS、长期自持 AI 入口或类似心智为核心的产品族群。",
  inclusionRules: [
    "统一总榜只收 core comparable 层。core 层要求产品至少明确是独立 assistant / AI OS / 长期 agent 入口，而不是 chat UI、builder、workspace 或 suite 附属助手。",
    "所有纳入判断都优先看官方仓库、官方 README、官方文档和官方网站，不使用内部营销稿、二手评测或社区转述作为主要证据。",
    "如果一个产品和龙虾类产品存在强替代关系，但原始产品形态不同，就进 adjacent 层而不进 core 总榜。"
  ],
  tierRules: [
    "Core：满足独立 assistant / AI OS 心智，且公开资料能证明它具备本地 / 自托管边界、行动层与官方文档入口。",
    "Adjacent：公开产品能力很强，但原始定位更偏 chat UI、workspace、knowledge assistant、workflow platform 或 suite-native assistant。",
    "Watch：如果未来补到更完整官方证据、功能明显进化或从 wrapper 演化成独立产品，再考虑升级。"
  ],
  scoringFormula: [
    "公共信号 40 分：GitHub stars 18 分、forks 8 分、最近活跃度 6 分、官方文档存在 4 分、开源许可证清晰度 4 分。",
    "能力覆盖 60 分：10 个公开可验证能力项等权计分，每项 6 分；状态为 yes 得 6 分，partial 得 3 分，no 得 0 分。",
    "总分 = 公共信号分 + 能力覆盖分；只有 core 产品才计算统一总分。"
  ],
  exclusions: [
    "闭源且缺少公开能力证据的产品不进统一总榜。",
    "官方主定位如果是 chat UI、workflow platform、agent builder、AI workspace 或 suite 内置 assistant，则不进入 core 总榜。",
    "没有公开证据支撑的能力点默认不给分，不因为“看起来应该有”而补分。"
  ],
  notes: [
    "这个榜单更像一套研究型索引，而不是营销式冠军榜。总分只是入口，真正的可信度来自纳入标准、能力矩阵和证据抽屉。",
    "高声量不等于高能力，强能力也不等于强声量，所以页面同时展示公共信号和能力覆盖。",
    "如果未来补到更完整的官方公开资料，这套榜单应该定期更新，而不是长期冻结。"
  ]
};

export const CHANGE_LOG: ChangeLogEntry[] = [
  {
    date: "2026-04-14",
    summary: "完全废弃旧版主观 rawScore 模型，改成官方公开证据驱动的纳入规则、公共信号和能力矩阵。"
  },
  {
    date: "2026-04-14",
    summary: "把 core 直系同类扩到 11 个产品，并把 Khoj、AnythingLLM、LibreChat、Open WebUI、Dify、Flowise、Jan 等放入 adjacent 层而不再硬混排。"
  }
];
