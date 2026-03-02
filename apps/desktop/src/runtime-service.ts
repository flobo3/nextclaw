import { fork, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

type RuntimeLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

type RuntimeServiceOptions = {
  logger: RuntimeLogger;
  scriptPath: string;
  startupTimeoutMs?: number;
  healthPath?: string;
};

export class RuntimeServiceProcess {
  private readonly startupTimeoutMs: number;
  private readonly healthPath: string;
  private child: ChildProcess | null = null;
  private port: number | null = null;

  constructor(private readonly options: RuntimeServiceOptions) {
    this.startupTimeoutMs = options.startupTimeoutMs ?? 25_000;
    this.healthPath = options.healthPath ?? "/api/health";
  }

  async start(): Promise<{ port: number; baseUrl: string }> {
    if (this.child) {
      throw new Error("Runtime process already started.");
    }
    const port = await pickFreePort();
    const child = fork(this.options.scriptPath, ["serve", "--ui-port", String(port)], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1"
      },
      stdio: "pipe"
    });

    child.stdout?.on("data", (chunk) => {
      this.options.logger.info(`[runtime] ${String(chunk).trimEnd()}`);
    });
    child.stderr?.on("data", (chunk) => {
      this.options.logger.warn(`[runtime] ${String(chunk).trimEnd()}`);
    });
    child.once("exit", (code, signal) => {
      this.options.logger.warn(`[runtime] exited (code=${String(code)}, signal=${String(signal)})`);
      this.child = null;
      this.port = null;
    });

    this.child = child;
    this.port = port;
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHealth(`${baseUrl}${this.healthPath}`, this.startupTimeoutMs);
    return { port, baseUrl };
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child || child.killed) {
      this.child = null;
      this.port = null;
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      child.once("exit", () => settle());
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
          settle();
        }
      }, 5_000);
    });

    this.child = null;
    this.port = null;
  }
}

export async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
      lastError = new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(350);
  }
  throw new Error(`Runtime health check timeout: ${String(lastError ?? "unknown error")}`);
}

async function pickFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate free port.")));
        return;
      }
      const port = address.port;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}
