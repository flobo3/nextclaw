import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "./nextclaw-sdk/feishu.js";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { wwwDomain } from "./domains.js";
import { resolveAnyEnabledFeishuToolsConfig } from "./tool-account.js";
import {
  assertLarkOk,
  createToolContext,
  handleInvokeError,
  json,
  registerTool,
  StringEnum,
} from "./user-tool-helpers.js";

const MAX_READ_ROWS = 200;
const MAX_WRITE_ROWS = 5000;
const MAX_WRITE_COLS = 100;

const SheetSchema = Type.Union([
  Type.Object({ action: Type.Literal("info"), url: Type.Optional(Type.String()), spreadsheet_token: Type.Optional(Type.String()) }),
  Type.Object({
    action: Type.Literal("read"),
    url: Type.Optional(Type.String()),
    spreadsheet_token: Type.Optional(Type.String()),
    range: Type.Optional(Type.String()),
    sheet_id: Type.Optional(Type.String()),
    value_render_option: Type.Optional(StringEnum(["FormattedValue", "UnformattedValue", "Formula", "ToString"])),
  }),
  Type.Object({
    action: Type.Literal("write"),
    url: Type.Optional(Type.String()),
    spreadsheet_token: Type.Optional(Type.String()),
    range: Type.Optional(Type.String()),
    sheet_id: Type.Optional(Type.String()),
    values: Type.Array(Type.Array(Type.Any())),
  }),
  Type.Object({
    action: Type.Literal("append"),
    url: Type.Optional(Type.String()),
    spreadsheet_token: Type.Optional(Type.String()),
    range: Type.Optional(Type.String()),
    sheet_id: Type.Optional(Type.String()),
    values: Type.Array(Type.Array(Type.Any())),
  }),
  Type.Object({
    action: Type.Literal("find"),
    url: Type.Optional(Type.String()),
    spreadsheet_token: Type.Optional(Type.String()),
    sheet_id: Type.String(),
    range: Type.Optional(Type.String()),
    find: Type.String(),
    match_case: Type.Optional(Type.Boolean()),
    match_entire_cell: Type.Optional(Type.Boolean()),
    search_by_regex: Type.Optional(Type.Boolean()),
    include_formulas: Type.Optional(Type.Boolean()),
  }),
  Type.Object({
    action: Type.Literal("create"),
    title: Type.String(),
    folder_token: Type.Optional(Type.String()),
    headers: Type.Optional(Type.Array(Type.Any())),
    data: Type.Optional(Type.Array(Type.Array(Type.Any()))),
  }),
  Type.Object({
    action: Type.Literal("export"),
    url: Type.Optional(Type.String()),
    spreadsheet_token: Type.Optional(Type.String()),
    sheet_id: Type.Optional(Type.String()),
    file_extension: StringEnum(["xlsx", "csv"]),
  }),
]);

function parseSheetUrl(url: string): { token: string; sheetId?: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/sheets\/([^/?#]+)/);
    if (!match) {
      return null;
    }
    return {
      token: match[1],
      sheetId: parsed.searchParams.get("sheet") || undefined,
    };
  } catch {
    return null;
  }
}

function resolveToken(params: { url?: string; spreadsheet_token?: string }) {
  if (params.spreadsheet_token) {
    return { token: params.spreadsheet_token };
  }
  if (params.url) {
    return parseSheetUrl(params.url);
  }
  return null;
}

function colLetter(n: number): string {
  let result = "";
  let value = n;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function flattenCellValue(cell: unknown): unknown {
  if (!Array.isArray(cell)) {
    return cell;
  }
  if (cell.length > 0 && cell.every((segment) => segment && typeof segment === "object" && "text" in (segment as object))) {
    return cell.map((segment) => String((segment as { text?: unknown }).text ?? "")).join("");
  }
  return cell;
}

async function resolveSheetRange(
  client: ReturnType<typeof createToolContext>["toolClient"] extends () => infer T ? T : never,
  token: string,
  range?: string,
  sheetId?: string,
) {
  if (range) return range;
  if (sheetId) return sheetId;
  const response = await client.invoke(
    "feishu_sheet.info",
    (sdk, opts) => sdk.sheets.spreadsheetSheet.query({ path: { spreadsheet_token: token } }, opts),
    { as: "user" },
  );
  assertLarkOk(response);
  const firstSheet = (response.data as { sheets?: Array<{ sheet_id?: string }> } | undefined)?.sheets?.[0];
  if (!firstSheet?.sheet_id) {
    throw new Error("Spreadsheet has no worksheets.");
  }
  return firstSheet.sheet_id;
}

export function registerFeishuSheetsTools(api: OpenClawPluginApi) {
  if (!api.config) return;
  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) return;
  if (!resolveAnyEnabledFeishuToolsConfig(accounts).sheets) return;

  registerTool(api, {
    name: "feishu_sheet",
    label: "Feishu Sheet",
    description: "按本人身份读取、写入、创建、查找和导出飞书电子表格。",
    parameters: SheetSchema,
    async execute(_toolCallId, params) {
      const payload = params as any;
      try {
        const client = createToolContext(api, "feishu_sheet").toolClient();

        if (payload.action === "create") {
          const createResponse = await client.invoke(
            "feishu_sheet.create",
            (sdk, opts) =>
              sdk.sheets.spreadsheet.create(
                {
                  data: {
                    title: payload.title,
                    folder_token: payload.folder_token,
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(createResponse);
          const spreadsheet = (createResponse.data as { spreadsheet?: { spreadsheet_token?: string; title?: string } } | undefined)?.spreadsheet;
          const token = spreadsheet?.spreadsheet_token;
          if (!token) {
            return json({ error: "创建电子表格失败，未返回 spreadsheet_token。" });
          }
          if (payload.headers || payload.data) {
            const sheetsResponse = await client.invoke(
              "feishu_sheet.create",
              (sdk, opts) => sdk.sheets.spreadsheetSheet.query({ path: { spreadsheet_token: token } }, opts),
              { as: "user" },
            );
            assertLarkOk(sheetsResponse);
            const firstSheet = (sheetsResponse.data as { sheets?: Array<{ sheet_id?: string }> } | undefined)?.sheets?.[0];
            const allRows = [
              ...(payload.headers ? [payload.headers] : []),
              ...((payload.data as unknown[][] | undefined) ?? []),
            ];
            if (firstSheet?.sheet_id && allRows.length > 0) {
              const numCols = Math.max(...allRows.map((row) => row.length), 1);
              const range = `${firstSheet.sheet_id}!A1:${colLetter(numCols)}${allRows.length}`;
              await client.invokeByPath("feishu_sheet.create", `/open-apis/sheets/v2/spreadsheets/${token}/values`, {
                method: "PUT",
                body: { valueRange: { range, values: allRows } },
                as: "user",
              });
            }
          }
          return json({
            spreadsheet_token: token,
            title: spreadsheet?.title ?? payload.title,
            url: `${wwwDomain(client.account.domain)}/sheets/${token}`,
          });
        }

        const tokenInfo = resolveToken(payload);
        if (!tokenInfo?.token) {
          return json({ error: "请传 spreadsheet_token 或 /sheets/TOKEN 形式的 url。" });
        }

        if (payload.action === "info") {
          const [spreadsheetRes, sheetsRes] = await Promise.all([
            client.invoke(
              "feishu_sheet.info",
              (sdk, opts) => sdk.sheets.spreadsheet.get({ path: { spreadsheet_token: tokenInfo.token } }, opts),
              { as: "user" },
            ),
            client.invoke(
              "feishu_sheet.info",
              (sdk, opts) => sdk.sheets.spreadsheetSheet.query({ path: { spreadsheet_token: tokenInfo.token } }, opts),
              { as: "user" },
            ),
          ]);
          assertLarkOk(spreadsheetRes);
          assertLarkOk(sheetsRes);
          return json({
            title: (spreadsheetRes.data as { spreadsheet?: { title?: string } } | undefined)?.spreadsheet?.title,
            spreadsheet_token: tokenInfo.token,
            url: `${wwwDomain(client.account.domain)}/sheets/${tokenInfo.token}`,
            sheets:
              ((sheetsRes.data as { sheets?: Array<Record<string, unknown>> } | undefined)?.sheets ?? []).map((sheet) => ({
                sheet_id: sheet.sheet_id,
                title: sheet.title,
                index: sheet.index,
                row_count: (sheet.grid_properties as { row_count?: number } | undefined)?.row_count,
                column_count: (sheet.grid_properties as { column_count?: number } | undefined)?.column_count,
              })),
          });
        }

        if (payload.action === "read") {
          const range = await resolveSheetRange(client, tokenInfo.token, payload.range, payload.sheet_id ?? tokenInfo.sheetId);
          const response = await client.invokeByPath<{
            data?: { valueRange?: { range?: string; values?: unknown[][] } };
          }>("feishu_sheet.read", `/open-apis/sheets/v2/spreadsheets/${tokenInfo.token}/values/${encodeURIComponent(range)}`, {
            method: "GET",
            query: {
              valueRenderOption: payload.value_render_option ?? "ToString",
              dateTimeRenderOption: "FormattedString",
            },
            as: "user",
          });
          const values = (response.data?.valueRange?.values ?? []).map((row) => row.map(flattenCellValue));
          return json({
            range: response.data?.valueRange?.range,
            values: values.slice(0, MAX_READ_ROWS),
            ...(values.length > MAX_READ_ROWS
              ? {
                  truncated: true,
                  total_rows: values.length,
                  hint: `结果超过 ${MAX_READ_ROWS} 行，已截断。请缩小 range 后重试。`,
                }
              : {}),
          });
        }

        if (payload.action === "write" || payload.action === "append") {
          if (payload.values.length > MAX_WRITE_ROWS) {
            return json({ error: `写入行数超过限制 ${MAX_WRITE_ROWS}` });
          }
          if (payload.values.some((row: unknown[]) => row.length > MAX_WRITE_COLS)) {
            return json({ error: `写入列数超过限制 ${MAX_WRITE_COLS}` });
          }
          const range = await resolveSheetRange(client, tokenInfo.token, payload.range, payload.sheet_id ?? tokenInfo.sheetId);
          const response = await client.invokeByPath<any>(
            payload.action === "write" ? "feishu_sheet.write" : "feishu_sheet.append",
            `/open-apis/sheets/v2/spreadsheets/${tokenInfo.token}/${payload.action === "write" ? "values" : "values_append"}`,
            {
              method: payload.action === "write" ? "PUT" : "POST",
              body: { valueRange: { range, values: payload.values } },
              as: "user",
            },
          );
          const updates = response.data?.updates ?? response.data;
          return json({
            updated_range: updates?.updatedRange,
            updated_rows: updates?.updatedRows,
            updated_columns: updates?.updatedColumns,
            updated_cells: updates?.updatedCells,
            revision: updates?.revision,
          });
        }

        if (payload.action === "find") {
          const response = await client.invoke(
            "feishu_sheet.find",
            (sdk, opts) =>
              sdk.sheets.spreadsheetSheet.find(
                {
                  path: { spreadsheet_token: tokenInfo.token, sheet_id: payload.sheet_id },
                  data: {
                    find: payload.find,
                    find_condition: {
                      range: payload.range ? `${payload.sheet_id}!${payload.range}` : payload.sheet_id,
                      ...(payload.match_case !== undefined ? { match_case: !payload.match_case } : {}),
                      ...(payload.match_entire_cell !== undefined ? { match_entire_cell: payload.match_entire_cell } : {}),
                      ...(payload.search_by_regex !== undefined ? { search_by_regex: payload.search_by_regex } : {}),
                      ...(payload.include_formulas !== undefined ? { include_formulas: payload.include_formulas } : {}),
                    },
                  },
                },
                opts,
              ),
            { as: "user" },
          );
          assertLarkOk(response);
          return json({
            matched_cells: (response.data as { find_result?: { matched_cells?: unknown[] } } | undefined)?.find_result?.matched_cells ?? [],
            matched_formula_cells:
              (response.data as { find_result?: { matched_formula_cells?: unknown[] } } | undefined)?.find_result?.matched_formula_cells ?? [],
          });
        }

        const exportCreate = await client.invoke(
          "feishu_sheet.export",
          (sdk, opts) =>
            sdk.drive.exportTask.create(
              {
                data: {
                  file_extension: payload.file_extension,
                  token: tokenInfo.token,
                  type: "sheet",
                  sub_id: payload.sheet_id,
                },
              },
              opts,
            ),
          { as: "user" },
        );
        assertLarkOk(exportCreate);
        const ticket = (exportCreate.data as { ticket?: string } | undefined)?.ticket;
        if (!ticket) {
          return json({ error: "导出任务创建失败，未返回 ticket。" });
        }
        for (let i = 0; i < 30; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const exportStatus = await client.invoke(
            "feishu_sheet.export",
            (sdk, opts) =>
              sdk.drive.exportTask.get({ path: { ticket }, params: { token: tokenInfo.token } }, opts),
            { as: "user" },
          );
          assertLarkOk(exportStatus);
          const result = (exportStatus.data as { result?: { job_status?: number; file_token?: string; file_name?: string; file_size?: number; job_error_msg?: string } } | undefined)?.result;
          if (result?.job_status === 0) {
            return json({
              file_token: result.file_token,
              file_name: result.file_name,
              file_size: result.file_size,
              file_extension: payload.file_extension,
            });
          }
          if ((result?.job_status ?? 0) >= 3) {
            return json({ error: result?.job_error_msg ?? `导出失败 (status=${result?.job_status})` });
          }
        }
        return json({ error: "导出任务超时，请稍后重试。" });
      } catch (error) {
        return handleInvokeError(error, api);
      }
    },
  }, { name: "feishu_sheet" });
}
