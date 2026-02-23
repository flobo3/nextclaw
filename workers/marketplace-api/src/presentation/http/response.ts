import type { Context } from "hono";

export class ApiResponseFactory {
  ok<T>(c: Context, data: T, status = 200) {
    return c.json({ ok: true, data }, status as 200);
  }

  error(c: Context, code: string, message: string, status = 400, details?: Record<string, unknown>) {
    return c.json(
      {
        ok: false,
        error: {
          code,
          message,
          details
        }
      },
      status as 400
    );
  }
}
