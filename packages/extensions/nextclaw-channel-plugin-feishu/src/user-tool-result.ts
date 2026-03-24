export function formatLarkError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const typed = error as {
    code?: number;
    msg?: string;
    message?: string;
    response?: { data?: { code?: number; msg?: string } };
  };

  if (typeof typed.code === "number" && typed.msg) {
    return typed.msg;
  }

  if (typed.response?.data?.msg) {
    return typed.response.data.msg;
  }

  return typed.message ?? String(error);
}
