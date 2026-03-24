import type { createToolContext } from "./user-tool-helpers.js";
import { assertLarkOk, json } from "./user-tool-helpers.js";
import { wwwDomain } from "./domains.js";

const MAX_READ_ROWS = 200;
const MAX_WRITE_ROWS = 5000;
const MAX_WRITE_COLS = 100;

type UserToolClient = ReturnType<ReturnType<typeof createToolContext>["toolClient"]>;

export type SheetParams = {
  action: "info" | "read" | "write" | "append" | "find" | "create" | "export";
  url?: string;
  spreadsheet_token?: string;
  range?: string;
  sheet_id?: string;
  value_render_option?: "FormattedValue" | "UnformattedValue" | "Formula" | "ToString";
  values?: unknown[][];
  find?: string;
  match_case?: boolean;
  match_entire_cell?: boolean;
  search_by_regex?: boolean;
  include_formulas?: boolean;
  title?: string;
  folder_token?: string;
  headers?: unknown[];
  data?: unknown[][];
  file_extension?: "xlsx" | "csv";
};

export type SheetTokenInfo = {
  token: string;
  sheetId?: string;
};

function parseSheetUrl(url: string): SheetTokenInfo | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/sheets\/([^/?#]+)/);
    if (!match) return null;
    return { token: match[1], sheetId: parsed.searchParams.get("sheet") || undefined };
  } catch {
    return null;
  }
}

export function resolveToken(params: SheetParams): SheetTokenInfo | null {
  if (params.spreadsheet_token) return { token: params.spreadsheet_token };
  if (params.url) return parseSheetUrl(params.url);
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
  if (!Array.isArray(cell)) return cell;
  if (cell.length > 0 && cell.every((segment) => segment && typeof segment === "object" && "text" in (segment as object))) {
    return cell.map((segment) => String((segment as { text?: unknown }).text ?? "")).join("");
  }
  return cell;
}

async function resolveSheetRange(
  client: UserToolClient,
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

export async function handleCreate(client: UserToolClient, payload: SheetParams) {
  const createResponse = await client.invoke(
    "feishu_sheet.create",
    (sdk, opts) =>
      sdk.sheets.spreadsheet.create(
        { data: { title: payload.title, folder_token: payload.folder_token } },
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
  const allRows = [
    ...(payload.headers ? [payload.headers] : []),
    ...((payload.data as unknown[][] | undefined) ?? []),
  ];
  if (allRows.length > 0) {
    const sheetsResponse = await client.invoke(
      "feishu_sheet.create",
      (sdk, opts) => sdk.sheets.spreadsheetSheet.query({ path: { spreadsheet_token: token } }, opts),
      { as: "user" },
    );
    assertLarkOk(sheetsResponse);
    const firstSheet = (sheetsResponse.data as { sheets?: Array<{ sheet_id?: string }> } | undefined)?.sheets?.[0];
    if (firstSheet?.sheet_id) {
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

export async function handleInfo(client: UserToolClient, token: string) {
  const [spreadsheetRes, sheetsRes] = await Promise.all([
    client.invoke(
      "feishu_sheet.info",
      (sdk, opts) => sdk.sheets.spreadsheet.get({ path: { spreadsheet_token: token } }, opts),
      { as: "user" },
    ),
    client.invoke(
      "feishu_sheet.info",
      (sdk, opts) => sdk.sheets.spreadsheetSheet.query({ path: { spreadsheet_token: token } }, opts),
      { as: "user" },
    ),
  ]);
  assertLarkOk(spreadsheetRes);
  assertLarkOk(sheetsRes);
  return json({
    title: (spreadsheetRes.data as { spreadsheet?: { title?: string } } | undefined)?.spreadsheet?.title,
    spreadsheet_token: token,
    url: `${wwwDomain(client.account.domain)}/sheets/${token}`,
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

export async function handleRead(client: UserToolClient, tokenInfo: SheetTokenInfo, payload: SheetParams) {
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

export async function handleWrite(client: UserToolClient, tokenInfo: SheetTokenInfo, payload: SheetParams) {
  if ((payload.values?.length ?? 0) > MAX_WRITE_ROWS) {
    return json({ error: `写入行数超过限制 ${MAX_WRITE_ROWS}` });
  }
  if ((payload.values ?? []).some((row) => row.length > MAX_WRITE_COLS)) {
    return json({ error: `写入列数超过限制 ${MAX_WRITE_COLS}` });
  }
  const range = await resolveSheetRange(client, tokenInfo.token, payload.range, payload.sheet_id ?? tokenInfo.sheetId);
  const response = await client.invokeByPath<{
    data?: {
      updatedRange?: string;
      updatedRows?: number;
      updatedColumns?: number;
      updatedCells?: number;
      revision?: number;
      updates?: {
        updatedRange?: string;
        updatedRows?: number;
        updatedColumns?: number;
        updatedCells?: number;
        revision?: number;
      };
    };
  }>(
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

export async function handleFind(client: UserToolClient, token: string, payload: SheetParams) {
  const response = await client.invoke(
    "feishu_sheet.find",
    (sdk, opts) =>
      sdk.sheets.spreadsheetSheet.find(
        {
          path: { spreadsheet_token: token, sheet_id: payload.sheet_id! },
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

export async function handleExport(client: UserToolClient, token: string, payload: SheetParams) {
  const exportCreate = await client.invoke(
    "feishu_sheet.export",
    (sdk, opts) =>
      sdk.drive.exportTask.create(
        {
          data: {
            file_extension: payload.file_extension,
            token,
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
      (sdk, opts) => sdk.drive.exportTask.get({ path: { ticket }, params: { token } }, opts),
      { as: "user" },
    );
    assertLarkOk(exportStatus);
    const result = (exportStatus.data as {
      result?: {
        job_status?: number;
        file_token?: string;
        file_name?: string;
        file_size?: number;
        job_error_msg?: string;
      };
    } | undefined)?.result;
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
}
