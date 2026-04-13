import type { Context } from "hono";
import { err, formatUserFacingError, ok } from "./response.js";
import type { UiRuntimeControlHost } from "./types.js";

export class RuntimeControlRoutesController {
  constructor(private readonly host: UiRuntimeControlHost) {}

  readonly getControl = async (c: Context) => {
    try {
      return c.json(ok(await this.host.getControl()));
    } catch (error) {
      return c.json(err("RUNTIME_CONTROL_FAILED", formatUserFacingError(error)), 500);
    }
  };

  readonly restartService = async (c: Context) => {
    try {
      return c.json(ok(await this.host.restartService()));
    } catch (error) {
      return c.json(err("RUNTIME_RESTART_FAILED", formatUserFacingError(error)), 400);
    }
  };
}
