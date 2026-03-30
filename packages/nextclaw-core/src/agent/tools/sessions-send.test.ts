import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MessageBus } from "../../bus/queue.js";
import { SessionManager } from "../../session/manager.js";
import { SessionsListTool, SessionsSendTool } from "./sessions.js";

const HOME_ENV_KEY = "NEXTCLAW_HOME";

describe("SessionsSendTool agent handoff", () => {
  let tempHome: string;
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env[HOME_ENV_KEY];
    tempHome = mkdtempSync(join(tmpdir(), "nextclaw-test-"));
    process.env[HOME_ENV_KEY] = tempHome;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env[HOME_ENV_KEY];
    } else {
      process.env[HOME_ENV_KEY] = previousHome;
    }
    rmSync(tempHome, { recursive: true, force: true });
  });

  it("blocks cross-agent handoff when max ping-pong turns is zero", async () => {
    const bus = new MessageBus();
    const sessions = new SessionManager(tempHome);
    const targetSessionKey = "agent:engineer:discord:channel:room-1";
    const targetSession = sessions.getOrCreate(targetSessionKey);
    targetSession.metadata.last_channel = "discord";
    targetSession.metadata.last_to = "room-1";
    sessions.save(targetSession);

    const tool = new SessionsSendTool(sessions, bus);
    tool.setContext({
      currentAgentId: "main",
      maxPingPongTurns: 0,
      currentHandoffDepth: 0
    });

    const payload = JSON.parse(
      await tool.execute({
        sessionKey: targetSessionKey,
        agentId: "engineer",
        message: "please continue"
      })
    ) as { status: string; error?: string };

    expect(payload.status).toBe("error");
    expect(payload.error).toContain("maxPingPongTurns=0");
  });

  it("publishes inbound handoff when cross-agent is allowed", async () => {
    const bus = new MessageBus();
    const sessions = new SessionManager(tempHome);
    const targetSessionKey = "agent:engineer:discord:channel:room-2";
    const targetSession = sessions.getOrCreate(targetSessionKey);
    targetSession.metadata.last_channel = "discord";
    targetSession.metadata.last_to = "room-2";
    targetSession.metadata.last_account_id = "default";
    sessions.save(targetSession);

    const tool = new SessionsSendTool(sessions, bus);
    tool.setContext({
      currentAgentId: "main",
      maxPingPongTurns: 2,
      currentHandoffDepth: 0
    });

    const payload = JSON.parse(
      await tool.execute({
        sessionKey: targetSessionKey,
        agentId: "engineer",
        message: "handoff task"
      })
    ) as { status: string; dispatched?: string };

    expect(payload.status).toBe("ok");
    expect(payload.dispatched).toBe("inbound");

    const inbound = await bus.consumeInbound();
    expect(inbound.channel).toBe("discord");
    expect(inbound.chatId).toBe("room-2");
    expect(inbound.metadata.target_agent_id).toBe("engineer");
    expect(inbound.metadata.agent_handoff_depth).toBe(1);
  });
});

describe("SessionsListTool route filters", () => {
  let tempHome: string;
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env[HOME_ENV_KEY];
    tempHome = mkdtempSync(join(tmpdir(), "nextclaw-test-"));
    process.env[HOME_ENV_KEY] = tempHome;
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env[HOME_ENV_KEY];
    } else {
      process.env[HOME_ENV_KEY] = previousHome;
    }
    rmSync(tempHome, { recursive: true, force: true });
  });

  it("filters by resolved weixin route fields", async () => {
    const sessions = new SessionManager(tempHome);

    const weixinSession = sessions.getOrCreate("agent:main:weixin:direct:user-1@im.wechat");
    weixinSession.metadata.last_channel = "weixin";
    weixinSession.metadata.last_to = "user-1@im.wechat";
    weixinSession.metadata.last_account_id = "bot-1@im.bot";
    sessions.save(weixinSession);

    const discordSession = sessions.getOrCreate("agent:main:discord:channel:room-1");
    discordSession.metadata.last_channel = "discord";
    discordSession.metadata.last_to = "room-1";
    sessions.save(discordSession);

    const tool = new SessionsListTool(sessions);
    const payload = JSON.parse(
      await tool.execute({
        channel: "weixin",
        to: "user-1@im.wechat",
        accountId: "bot-1@im.bot",
        limit: 10,
      }),
    ) as { sessions: Array<{ key: string; lastTo?: string; lastAccountId?: string }> };

    expect(payload.sessions).toHaveLength(1);
    expect(payload.sessions[0]?.key).toBe("agent:main:weixin:direct:user-1@im.wechat");
    expect(payload.sessions[0]?.lastTo).toBe("user-1@im.wechat");
    expect(payload.sessions[0]?.lastAccountId).toBe("bot-1@im.bot");
  });

  it("filters by exact sessionKey when provided", async () => {
    const sessions = new SessionManager(tempHome);

    const firstSession = sessions.getOrCreate("agent:main:weixin:direct:user-1@im.wechat");
    firstSession.metadata.last_channel = "weixin";
    firstSession.metadata.last_to = "user-1@im.wechat";
    sessions.save(firstSession);

    const secondSession = sessions.getOrCreate("agent:main:weixin:direct:user-2@im.wechat");
    secondSession.metadata.last_channel = "weixin";
    secondSession.metadata.last_to = "user-2@im.wechat";
    sessions.save(secondSession);

    const tool = new SessionsListTool(sessions);
    const payload = JSON.parse(
      await tool.execute({
        sessionKey: "agent:main:weixin:direct:user-2@im.wechat",
        limit: 10,
      }),
    ) as { sessions: Array<{ key: string }> };

    expect(payload.sessions).toHaveLength(1);
    expect(payload.sessions[0]?.key).toBe("agent:main:weixin:direct:user-2@im.wechat");
  });
});
