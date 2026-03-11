import * as Lark from "@larksuiteoapi/node-sdk";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool, OpenClawConfig, OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import type {
  OpenClawPluginCommandDefinition,
  PluginCommandContext,
} from "../../src/plugins/types.js";

type TaskboardFieldMap = {
  title?: string;
  status?: string;
  priority?: string;
  owner?: string;
  dueAt?: string;
  source?: string;
  notes?: string;
};

type TaskboardBoardConfig = {
  label?: string;
  agentId?: string;
  accountId?: string;
  url?: string;
  appToken: string;
  tableId: string;
  fieldMap?: TaskboardFieldMap;
};

type TaskboardPluginConfig = {
  defaultBoard?: string;
  boards?: Record<string, TaskboardBoardConfig>;
};

type TaskboardRecordFields = Record<string, string | number>;

type ResolvedTaskboard = {
  key: string;
  board: TaskboardBoardConfig;
  fieldMap: Required<TaskboardFieldMap>;
};

type LarkResponse<T = unknown> = {
  code?: number;
  msg?: string;
  data?: T;
};

type LarkField = {
  field_id?: string;
  field_name?: string;
  type?: number;
  is_primary?: boolean;
};

type LarkRecord = {
  record_id?: string;
  fields?: Record<string, unknown>;
};

type TaskRecord = {
  recordId: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
  source: string;
  notes: string;
  dueAtMs: number | null;
  dueAtText: string;
};

type RegisterDeps = {
  createClient?: (cfg: OpenClawConfig, accountId?: string) => Lark.Client;
};

type ToolContext = {
  config?: OpenClawConfig;
  agentId?: string;
  agentAccountId?: string;
  messageChannel?: string;
};

type FieldUiType = "Text" | "SingleSelect" | "DateTime";

const PLUGIN_ID = "hyper-claw-taskboard";
const DEFAULT_FIELD_MAP: Required<TaskboardFieldMap> = {
  title: "任务名称",
  status: "状态",
  priority: "优先级",
  owner: "负责人",
  dueAt: "截止日期",
  source: "来源",
  notes: "备注",
};

const DEFAULT_STATUS_OPTIONS = [
  { name: "待办", color: 0 },
  { name: "进行中", color: 5 },
  { name: "已完成", color: 2 },
  { name: "阻塞", color: 1 },
] as const;

const DEFAULT_PRIORITY_OPTIONS = [
  { name: "P0-紧急", color: 1 },
  { name: "P1-高", color: 5 },
  { name: "P2-中", color: 2 },
  { name: "P3-低", color: 7 },
] as const;

const DEFAULT_SOURCE_OPTIONS = [
  { name: "用户指派", color: 0 },
  { name: "Strategist 建议", color: 5 },
  { name: "Heartbeat 发现", color: 2 },
] as const;

const DEFAULT_CLEANUP_FIELD_TYPES = new Set([3, 5, 17]);

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeFieldMap(value: unknown): TaskboardFieldMap | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    title: normalizeOptionalString(record.title),
    status: normalizeOptionalString(record.status),
    priority: normalizeOptionalString(record.priority),
    owner: normalizeOptionalString(record.owner),
    dueAt: normalizeOptionalString(record.dueAt),
    source: normalizeOptionalString(record.source),
    notes: normalizeOptionalString(record.notes),
  };
}

function normalizeBoardConfig(value: unknown): TaskboardBoardConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const appToken = normalizeOptionalString(record.appToken);
  const tableId = normalizeOptionalString(record.tableId);
  if (!appToken || !tableId) {
    return null;
  }
  return {
    label: normalizeOptionalString(record.label),
    agentId: normalizeOptionalString(record.agentId),
    accountId: normalizeOptionalString(record.accountId),
    url: normalizeOptionalString(record.url),
    appToken,
    tableId,
    fieldMap: normalizeFieldMap(record.fieldMap),
  };
}

function normalizePluginConfig(value: unknown): TaskboardPluginConfig {
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  const boardsRaw = record.boards;
  const boards: Record<string, TaskboardBoardConfig> = {};
  if (boardsRaw && typeof boardsRaw === "object") {
    for (const [key, boardValue] of Object.entries(boardsRaw as Record<string, unknown>)) {
      const normalizedKey = normalizeOptionalString(key);
      const board = normalizeBoardConfig(boardValue);
      if (normalizedKey && board) {
        boards[normalizedKey] = board;
      }
    }
  }
  return {
    defaultBoard: normalizeOptionalString(record.defaultBoard),
    ...(Object.keys(boards).length > 0 ? { boards } : {}),
  };
}

function mergeFieldMap(fieldMap?: TaskboardFieldMap): Required<TaskboardFieldMap> {
  return {
    title: fieldMap?.title ?? DEFAULT_FIELD_MAP.title,
    status: fieldMap?.status ?? DEFAULT_FIELD_MAP.status,
    priority: fieldMap?.priority ?? DEFAULT_FIELD_MAP.priority,
    owner: fieldMap?.owner ?? DEFAULT_FIELD_MAP.owner,
    dueAt: fieldMap?.dueAt ?? DEFAULT_FIELD_MAP.dueAt,
    source: fieldMap?.source ?? DEFAULT_FIELD_MAP.source,
    notes: fieldMap?.notes ?? DEFAULT_FIELD_MAP.notes,
  };
}

function resolveDefaultAgentId(cfg: OpenClawConfig): string | undefined {
  const list = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const selected = list.find((entry) => entry?.default === true) ?? list[0];
  return normalizeOptionalString(selected?.id);
}

function resolveBindingAgentId(
  cfg: OpenClawConfig,
  channelId: string | undefined,
  accountId: string | undefined,
): string | undefined {
  const normalizedChannel = normalizeOptionalString(channelId);
  const normalizedAccountId = normalizeOptionalString(accountId);
  if (!normalizedChannel || !normalizedAccountId || !Array.isArray(cfg.bindings)) {
    return undefined;
  }
  for (const binding of cfg.bindings) {
    const match = binding?.match;
    if (
      normalizeOptionalString(match?.channel) === normalizedChannel &&
      normalizeOptionalString(match?.accountId) === normalizedAccountId
    ) {
      return normalizeOptionalString(binding.agentId);
    }
  }
  return undefined;
}

function buildBoardCandidates(params: {
  pluginConfig: TaskboardPluginConfig;
  config: OpenClawConfig;
  agentId?: string;
  agentAccountId?: string;
  accountId?: string;
  channelId?: string;
  explicitBoardKey?: string;
}): string[] {
  const candidates = [
    normalizeOptionalString(params.explicitBoardKey),
    normalizeOptionalString(params.agentId),
    resolveBindingAgentId(params.config, params.channelId, params.accountId),
    normalizeOptionalString(params.agentAccountId),
    normalizeOptionalString(params.accountId),
    normalizeOptionalString(params.pluginConfig.defaultBoard),
    resolveDefaultAgentId(params.config),
    Object.keys(params.pluginConfig.boards ?? {})[0],
  ];
  return [...new Set(candidates.filter(Boolean) as string[])];
}

function resolveTaskboardByCandidates(
  pluginConfig: TaskboardPluginConfig,
  candidates: string[],
): ResolvedTaskboard | null {
  const boards = pluginConfig.boards ?? {};
  for (const candidate of candidates) {
    const direct = boards[candidate];
    if (direct) {
      return { key: candidate, board: direct, fieldMap: mergeFieldMap(direct.fieldMap) };
    }
    const aliased = Object.entries(boards).find(
      ([, board]) => board.agentId === candidate || board.accountId === candidate,
    );
    if (aliased) {
      return {
        key: aliased[0],
        board: aliased[1],
        fieldMap: mergeFieldMap(aliased[1].fieldMap),
      };
    }
  }
  return null;
}

function resolveTaskboardForCommand(
  pluginConfig: TaskboardPluginConfig,
  ctx: PluginCommandContext,
): ResolvedTaskboard | null {
  const channelId = normalizeOptionalString(ctx.channelId ?? ctx.channel);
  const candidates = buildBoardCandidates({
    pluginConfig,
    config: ctx.config,
    accountId: ctx.accountId,
    channelId,
  });
  return resolveTaskboardByCandidates(pluginConfig, candidates);
}

function resolveTaskboardForTool(
  pluginConfig: TaskboardPluginConfig,
  ctx: {
    config?: OpenClawConfig;
    agentId?: string;
    agentAccountId?: string;
    messageChannel?: string;
  },
  explicitBoardKey?: string,
): ResolvedTaskboard | null {
  if (!ctx.config) {
    return null;
  }
  const candidates = buildBoardCandidates({
    pluginConfig,
    config: ctx.config,
    explicitBoardKey,
    agentId: ctx.agentId,
    agentAccountId: ctx.agentAccountId,
    accountId: ctx.agentAccountId,
    channelId: ctx.messageChannel,
  });
  return resolveTaskboardByCandidates(pluginConfig, candidates);
}

function guessBoardKeyForWrite(
  pluginConfig: TaskboardPluginConfig,
  params: {
    config: OpenClawConfig;
    channelId?: string;
    accountId?: string;
    agentId?: string;
  },
): string {
  return (
    resolveBindingAgentId(params.config, params.channelId, params.accountId) ??
    normalizeOptionalString(params.accountId) ??
    normalizeOptionalString(params.agentId) ??
    normalizeOptionalString(pluginConfig.defaultBoard) ??
    resolveDefaultAgentId(params.config) ??
    "default"
  );
}

function buildNextPluginConfig(
  pluginConfig: TaskboardPluginConfig,
  key: string,
  board: TaskboardBoardConfig,
): TaskboardPluginConfig {
  return {
    defaultBoard: pluginConfig.defaultBoard ?? key,
    boards: {
      ...(pluginConfig.boards ?? {}),
      [key]: board,
    },
  };
}

function buildNextConfigWithPluginConfig(
  cfg: OpenClawConfig,
  pluginConfig: TaskboardPluginConfig,
): OpenClawConfig {
  const allow = Array.isArray(cfg.plugins?.allow) ? [...cfg.plugins.allow] : [];
  if (!allow.includes(PLUGIN_ID)) {
    allow.push(PLUGIN_ID);
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow,
      entries: {
        ...(cfg.plugins?.entries ?? {}),
        [PLUGIN_ID]: {
          ...(cfg.plugins?.entries?.[PLUGIN_ID] ?? {}),
          enabled: true,
          config: pluginConfig,
        },
      },
    },
  };
}

function buildHelpText() {
  return [
    "Taskboard commands:",
    "",
    "/taskboard status",
    "/taskboard list [open|all|done|blocked]",
    "/taskboard create [看板名称]",
    "/taskboard link <bitable-url>",
    "",
    "Examples:",
    "- /taskboard create HyperCreator 任务看板",
    "- /taskboard link https://xxx.feishu.cn/base/ABC123?table=tblXXX",
    "- /taskboard list open",
  ].join("\n");
}

class LarkApiError extends Error {
  constructor(
    readonly code: number,
    readonly api: string,
    readonly context?: Record<string, unknown>,
    message?: string,
  ) {
    super(`[${api}] code=${code} message=${message ?? "unknown error"}`);
    this.name = "LarkApiError";
  }
}

function ensureLarkSuccess<T>(
  res: LarkResponse<T>,
  api: string,
  context?: Record<string, unknown>,
): asserts res is LarkResponse<T> & { code: 0 } {
  if (res.code !== 0) {
    throw new LarkApiError(res.code ?? -1, api, context, res.msg);
  }
}

function resolveLarkDomain(domain: string | undefined): Lark.Domain | string {
  if (!domain || domain === "feishu") {
    return Lark.Domain.Feishu;
  }
  if (domain === "lark") {
    return Lark.Domain.Lark;
  }
  return domain.replace(/\/+$/, "");
}

function createDefaultClient(cfg: OpenClawConfig, preferredAccountId?: string): Lark.Client {
  const feishuCfg = (cfg.channels?.feishu as Record<string, unknown> | undefined) ?? {};
  const accounts = (feishuCfg.accounts as Record<string, unknown> | undefined) ?? {};
  const accountId =
    normalizeOptionalString(preferredAccountId) ??
    normalizeOptionalString(feishuCfg.defaultAccount) ??
    Object.keys(accounts)[0] ??
    "default";
  const accountCfg = (accounts[accountId] as Record<string, unknown> | undefined) ?? {};
  const appId = normalizeOptionalString(accountCfg.appId ?? feishuCfg.appId);
  const appSecret = normalizeOptionalString(accountCfg.appSecret ?? feishuCfg.appSecret);
  const domain = normalizeOptionalString(String(accountCfg.domain ?? feishuCfg.domain ?? "feishu"));
  if (!appId || !appSecret) {
    throw new Error(`Feishu credentials not configured for account "${accountId}"`);
  }
  return new Lark.Client({
    appId,
    appSecret,
    appType: Lark.AppType.SelfBuild,
    domain: resolveLarkDomain(domain),
  });
}

function parseBitableUrl(url: string): { token: string; tableId?: string; isWiki: boolean } | null {
  try {
    const parsed = new URL(url);
    const tableId = normalizeOptionalString(parsed.searchParams.get("table") ?? undefined);
    const wikiMatch = parsed.pathname.match(/\/wiki\/([A-Za-z0-9]+)/);
    if (wikiMatch?.[1]) {
      return { token: wikiMatch[1], tableId, isWiki: true };
    }
    const baseMatch = parsed.pathname.match(/\/base\/([A-Za-z0-9]+)/);
    if (baseMatch?.[1]) {
      return { token: baseMatch[1], tableId, isWiki: false };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveAppTokenFromUrl(client: Lark.Client, url: string) {
  const parsed = parseBitableUrl(url);
  if (!parsed) {
    throw new Error("Invalid Feishu Bitable URL");
  }

  let appToken = parsed.token;
  if (parsed.isWiki) {
    const nodeRes = (await client.wiki.space.getNode({
      params: { token: parsed.token },
    })) as LarkResponse<{ node?: { obj_type?: string; obj_token?: string } }>;
    ensureLarkSuccess(nodeRes, "wiki.space.getNode", { token: parsed.token });
    if (nodeRes.data?.node?.obj_type !== "bitable" || !nodeRes.data?.node?.obj_token) {
      throw new Error("Wiki node is not a Bitable document");
    }
    appToken = nodeRes.data.node.obj_token;
  }

  const appRes = (await client.bitable.app.get({
    path: { app_token: appToken },
  })) as LarkResponse<{ app?: { name?: string } }>;
  ensureLarkSuccess(appRes, "bitable.app.get", { appToken });

  let tableId = parsed.tableId;
  if (!tableId) {
    const tablesRes = (await client.bitable.appTable.list({
      path: { app_token: appToken },
    })) as LarkResponse<{ items?: Array<{ table_id?: string }> }>;
    ensureLarkSuccess(tablesRes, "bitable.appTable.list", { appToken });
    tableId = normalizeOptionalString(tablesRes.data?.items?.[0]?.table_id);
  }
  if (!tableId) {
    throw new Error("Unable to resolve Bitable table_id from URL");
  }

  return {
    appToken,
    tableId,
    label: normalizeOptionalString(appRes.data?.app?.name),
  };
}

async function listFields(
  client: Lark.Client,
  appToken: string,
  tableId: string,
): Promise<LarkField[]> {
  const res = (await client.bitable.appTableField.list({
    path: { app_token: appToken, table_id: tableId },
  })) as LarkResponse<{ items?: LarkField[] }>;
  ensureLarkSuccess(res, "bitable.appTableField.list", { appToken, tableId });
  return res.data?.items ?? [];
}

async function renamePrimaryField(
  client: Lark.Client,
  appToken: string,
  tableId: string,
  fields: LarkField[],
): Promise<void> {
  const primaryField = fields.find((field) => field.is_primary && field.field_id);
  if (!primaryField?.field_id || primaryField.field_name === DEFAULT_FIELD_MAP.title) {
    return;
  }
  const res = (await client.bitable.appTableField.update({
    path: {
      app_token: appToken,
      table_id: tableId,
      field_id: primaryField.field_id,
    },
    data: {
      field_name: DEFAULT_FIELD_MAP.title,
      type: 1,
      ui_type: "Text",
    },
  })) as LarkResponse;
  ensureLarkSuccess(res, "bitable.appTableField.update", { appToken, tableId });
}

async function deleteDefaultFields(
  client: Lark.Client,
  appToken: string,
  tableId: string,
  fields: LarkField[],
): Promise<void> {
  for (const field of fields) {
    if (field.is_primary || !field.field_id || !DEFAULT_CLEANUP_FIELD_TYPES.has(field.type ?? -1)) {
      continue;
    }
    const res = (await client.bitable.appTableField.delete({
      path: {
        app_token: appToken,
        table_id: tableId,
        field_id: field.field_id,
      },
    })) as LarkResponse;
    ensureLarkSuccess(res, "bitable.appTableField.delete", { appToken, tableId });
  }
}

async function deleteEmptyRows(
  client: Lark.Client,
  appToken: string,
  tableId: string,
): Promise<void> {
  const listRes = (await client.bitable.appTableRecord.list({
    path: { app_token: appToken, table_id: tableId },
    params: { page_size: 100 },
  })) as LarkResponse<{ items?: LarkRecord[] }>;
  ensureLarkSuccess(listRes, "bitable.appTableRecord.list", { appToken, tableId });
  const recordIds = (listRes.data?.items ?? [])
    .filter((record) => !record.fields || Object.keys(record.fields).length === 0)
    .map((record) => normalizeOptionalString(record.record_id))
    .filter(Boolean) as string[];
  if (recordIds.length === 0) {
    return;
  }
  const batchRes = (await client.bitable.appTableRecord.batchDelete({
    path: { app_token: appToken, table_id: tableId },
    data: { records: recordIds },
  })) as LarkResponse;
  ensureLarkSuccess(batchRes, "bitable.appTableRecord.batchDelete", { appToken, tableId });
}

async function createField(params: {
  client: Lark.Client;
  appToken: string;
  tableId: string;
  fieldName: string;
  type: number;
  uiType: FieldUiType;
  property?: Record<string, unknown>;
}): Promise<void> {
  const res = (await params.client.bitable.appTableField.create({
    path: {
      app_token: params.appToken,
      table_id: params.tableId,
    },
    data: {
      field_name: params.fieldName,
      type: params.type,
      ui_type: params.uiType,
      ...(params.property ? { property: params.property } : {}),
    },
  })) as LarkResponse;
  ensureLarkSuccess(res, "bitable.appTableField.create", {
    appToken: params.appToken,
    tableId: params.tableId,
    fieldName: params.fieldName,
  });
}

async function createTaskboardScaffold(client: Lark.Client, label: string) {
  const createRes = (await client.bitable.app.create({
    data: { name: label },
  })) as LarkResponse<{ app?: { app_token?: string; url?: string } }>;
  ensureLarkSuccess(createRes, "bitable.app.create", { label });
  const appToken = normalizeOptionalString(createRes.data?.app?.app_token);
  if (!appToken) {
    throw new Error("Bitable create succeeded but app_token is missing");
  }

  const tablesRes = (await client.bitable.appTable.list({
    path: { app_token: appToken },
  })) as LarkResponse<{ items?: Array<{ table_id?: string }> }>;
  ensureLarkSuccess(tablesRes, "bitable.appTable.list", { appToken });
  const tableId = normalizeOptionalString(tablesRes.data?.items?.[0]?.table_id);
  if (!tableId) {
    throw new Error("Created Bitable has no default table");
  }

  const initialFields = await listFields(client, appToken, tableId);
  await renamePrimaryField(client, appToken, tableId, initialFields);
  await deleteDefaultFields(client, appToken, tableId, initialFields);
  await deleteEmptyRows(client, appToken, tableId);

  const latestFields = await listFields(client, appToken, tableId);
  const existingNames = new Set(
    latestFields.map((field) => normalizeOptionalString(field.field_name)).filter(Boolean),
  );

  const maybeCreateField = async (
    fieldName: string,
    type: number,
    uiType: FieldUiType,
    property?: Record<string, unknown>,
  ) => {
    if (existingNames.has(fieldName)) {
      return;
    }
    await createField({ client, appToken, tableId, fieldName, type, uiType, property });
    existingNames.add(fieldName);
  };

  await maybeCreateField(DEFAULT_FIELD_MAP.status, 3, "SingleSelect", {
    options: [...DEFAULT_STATUS_OPTIONS],
  });
  await maybeCreateField(DEFAULT_FIELD_MAP.priority, 3, "SingleSelect", {
    options: [...DEFAULT_PRIORITY_OPTIONS],
  });
  await maybeCreateField(DEFAULT_FIELD_MAP.owner, 1, "Text");
  await maybeCreateField(DEFAULT_FIELD_MAP.dueAt, 5, "DateTime");
  await maybeCreateField(DEFAULT_FIELD_MAP.source, 3, "SingleSelect", {
    options: [...DEFAULT_SOURCE_OPTIONS],
  });
  await maybeCreateField(DEFAULT_FIELD_MAP.notes, 1, "Text");

  return {
    appToken,
    tableId,
    url: normalizeOptionalString(createRes.data?.app?.url),
  };
}

async function listAllRecords(
  client: Lark.Client,
  appToken: string,
  tableId: string,
  limit = 200,
): Promise<LarkRecord[]> {
  const records: LarkRecord[] = [];
  let pageToken: string | undefined;
  while (records.length < limit) {
    const res = (await client.bitable.appTableRecord.list({
      path: { app_token: appToken, table_id: tableId },
      params: {
        page_size: Math.min(100, limit - records.length),
        ...(pageToken ? { page_token: pageToken } : {}),
      },
    })) as LarkResponse<{
      items?: LarkRecord[];
      has_more?: boolean;
      page_token?: string;
    }>;
    ensureLarkSuccess(res, "bitable.appTableRecord.list", { appToken, tableId });
    records.push(...(res.data?.items ?? []));
    if (!res.data?.has_more || !res.data?.page_token) {
      break;
    }
    pageToken = res.data.page_token;
  }
  return records;
}

function readCellText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(readCellText).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      normalizeOptionalString(record.text) ??
      normalizeOptionalString(record.name) ??
      normalizeOptionalString(record.link) ??
      ""
    );
  }
  return "";
}

function readDueAtMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function formatDueAtText(dueAtMs: number | null): string {
  if (!dueAtMs) {
    return "";
  }
  return new Date(dueAtMs).toISOString().slice(0, 10);
}

function toTaskRecord(record: LarkRecord, fieldMap: Required<TaskboardFieldMap>): TaskRecord {
  const fields = record.fields ?? {};
  const dueAtMs = readDueAtMs(fields[fieldMap.dueAt]);
  return {
    recordId: normalizeOptionalString(record.record_id) ?? "",
    title: readCellText(fields[fieldMap.title]),
    status: readCellText(fields[fieldMap.status]),
    priority: readCellText(fields[fieldMap.priority]),
    owner: readCellText(fields[fieldMap.owner]),
    source: readCellText(fields[fieldMap.source]),
    notes: readCellText(fields[fieldMap.notes]),
    dueAtMs,
    dueAtText: formatDueAtText(dueAtMs),
  };
}

function resolveStatusFilter(raw: string | undefined): string[] | null {
  const normalized = normalizeOptionalString(raw)?.toLowerCase();
  if (!normalized || normalized === "all") {
    return null;
  }
  if (normalized === "open") {
    return ["待办", "进行中", "阻塞"];
  }
  if (normalized === "todo") {
    return ["待办"];
  }
  if (normalized === "doing" || normalized === "in-progress") {
    return ["进行中"];
  }
  if (normalized === "done" || normalized === "completed") {
    return ["已完成"];
  }
  if (normalized === "blocked") {
    return ["阻塞"];
  }
  return [raw ?? normalized];
}

function filterTasks(
  tasks: TaskRecord[],
  params: { status?: string; query?: string; limit?: number },
): TaskRecord[] {
  const statusFilter = resolveStatusFilter(params.status);
  const query = normalizeOptionalString(params.query)?.toLowerCase();
  const filtered = tasks
    .filter((task) => task.recordId && task.title)
    .filter((task) => (statusFilter ? statusFilter.includes(task.status) : true))
    .filter((task) =>
      query ? `${task.title}\n${task.notes}\n${task.owner}`.toLowerCase().includes(query) : true,
    )
    .sort((a, b) => {
      if (a.dueAtMs && b.dueAtMs && a.dueAtMs !== b.dueAtMs) {
        return a.dueAtMs - b.dueAtMs;
      }
      if (a.dueAtMs && !b.dueAtMs) {
        return -1;
      }
      if (!a.dueAtMs && b.dueAtMs) {
        return 1;
      }
      return a.title.localeCompare(b.title);
    });
  return filtered.slice(0, Math.max(1, params.limit ?? 20));
}

function summarizeTasks(tasks: TaskRecord[]) {
  const counts: Record<string, number> = {};
  for (const task of tasks) {
    const key = task.status || "未设置";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function formatTaskListText(
  board: ResolvedTaskboard,
  tasks: TaskRecord[],
  totalTasks: number,
): string {
  const counts = summarizeTasks(tasks);
  const countLine =
    Object.keys(counts).length > 0
      ? Object.entries(counts)
          .map(([key, count]) => `${key}:${count}`)
          .join(" | ")
      : "暂无任务";

  const lines = [
    `${board.board.label ?? board.key}`,
    `任务数: ${totalTasks}`,
    `筛选结果: ${countLine}`,
  ];
  if (tasks.length === 0) {
    lines.push("", "没有匹配任务。");
    return lines.join("\n");
  }

  lines.push("");
  for (const task of tasks) {
    const meta = [
      task.status ? `[${task.status}]` : "",
      task.priority,
      task.owner ? `@${task.owner}` : "",
      task.dueAtText ? `due:${task.dueAtText}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`- ${task.recordId}: ${meta} ${task.title}`.trim());
  }
  return lines.join("\n");
}

function buildBoardSummaryText(board: ResolvedTaskboard, tasks: TaskRecord[]): string {
  const counts = summarizeTasks(tasks);
  const countsText =
    Object.keys(counts).length > 0
      ? Object.entries(counts)
          .map(([key, count]) => `${key}:${count}`)
          .join(" | ")
      : "暂无任务";
  return [
    `看板: ${board.board.label ?? board.key}`,
    `Key: ${board.key}`,
    `Account: ${board.board.accountId ?? "-"}`,
    `Agent: ${board.board.agentId ?? "-"}`,
    `URL: ${board.board.url ?? "-"}`,
    `统计: ${countsText}`,
  ].join("\n");
}

function parseDueAt(input: string | undefined): number | undefined {
  const normalized = normalizeOptionalString(input);
  if (!normalized) {
    return undefined;
  }
  const asNumber = Number(normalized);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.floor(asNumber);
  }
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid dueAt value: ${normalized}`);
  }
  return parsed;
}

function buildRecordFields(
  fieldMap: Required<TaskboardFieldMap>,
  input: {
    title?: string;
    status?: string;
    priority?: string;
    owner?: string;
    dueAt?: string;
    source?: string;
    notes?: string;
  },
): TaskboardRecordFields {
  const fields: TaskboardRecordFields = {};
  const title = normalizeOptionalString(input.title);
  const status = normalizeOptionalString(input.status);
  const priority = normalizeOptionalString(input.priority);
  const owner = normalizeOptionalString(input.owner);
  const source = normalizeOptionalString(input.source);
  const notes = normalizeOptionalString(input.notes);
  const dueAtMs = parseDueAt(input.dueAt);

  if (title) fields[fieldMap.title] = title;
  if (status) fields[fieldMap.status] = status;
  if (priority) fields[fieldMap.priority] = priority;
  if (owner) fields[fieldMap.owner] = owner;
  if (source) fields[fieldMap.source] = source;
  if (notes) fields[fieldMap.notes] = notes;
  if (typeof dueAtMs === "number") fields[fieldMap.dueAt] = dueAtMs;
  return fields;
}

async function createRecord(
  client: Lark.Client,
  board: ResolvedTaskboard,
  fields: TaskboardRecordFields,
) {
  const res = (await client.bitable.appTableRecord.create({
    path: {
      app_token: board.board.appToken,
      table_id: board.board.tableId,
    },
    data: { fields },
  })) as LarkResponse<{ record?: LarkRecord }>;
  ensureLarkSuccess(res, "bitable.appTableRecord.create", { board: board.key });
  return res.data?.record;
}

async function updateRecord(
  client: Lark.Client,
  board: ResolvedTaskboard,
  recordId: string,
  fields: TaskboardRecordFields,
) {
  const res = (await client.bitable.appTableRecord.update({
    path: {
      app_token: board.board.appToken,
      table_id: board.board.tableId,
      record_id: recordId,
    },
    data: { fields },
  })) as LarkResponse<{ record?: LarkRecord }>;
  ensureLarkSuccess(res, "bitable.appTableRecord.update", { board: board.key, recordId });
  return res.data?.record;
}

function createTaskboardPlugin(deps?: RegisterDeps) {
  const createClient = deps?.createClient ?? createDefaultClient;

  return {
    id: PLUGIN_ID,
    name: "Hyper Claw Taskboard",
    description: "Feishu Bitable taskboard commands and agent tools for Hyper Claw",
    register(api: OpenClawPluginApi) {
      const pluginConfig = normalizePluginConfig(api.pluginConfig);

      async function withCommandBoard(
        ctx: PluginCommandContext,
        explicitBoardKey?: string,
      ): Promise<{ board: ResolvedTaskboard; client: Lark.Client }> {
        const board =
          resolveTaskboardByCandidates(pluginConfig, [
            ...buildBoardCandidates({
              pluginConfig,
              config: ctx.config,
              explicitBoardKey,
              accountId: ctx.accountId,
              channelId: ctx.channelId ?? ctx.channel,
            }),
          ]) ?? resolveTaskboardForCommand(pluginConfig, ctx);
        if (!board) {
          throw new Error(
            "当前上下文还没有配置任务看板。先运行 /taskboard create 或 /taskboard link <url>。",
          );
        }
        return {
          board,
          client: createClient(ctx.config, board.board.accountId ?? ctx.accountId),
        };
      }

      function registerTool(factory: (ctx: ToolContext) => AnyAgentTool) {
        api.registerTool((ctx) => factory(ctx));
      }

      registerTool(
        (ctx): AnyAgentTool => ({
          name: "taskboard_summary",
          label: "Taskboard Summary",
          description: "Show the current Hyper Claw Feishu taskboard and counts by status.",
          parameters: Type.Object({
            boardKey: Type.Optional(Type.String()),
          }),
          async execute(_toolCallId, params) {
            if (!ctx.config) {
              return jsonResult({ error: "Tool config unavailable" });
            }
            const board = resolveTaskboardForTool(pluginConfig, ctx, params.boardKey);
            if (!board) {
              return jsonResult({ error: "No taskboard configured for the current agent/account" });
            }
            const client = createClient(ctx.config, board.board.accountId ?? ctx.agentAccountId);
            const tasks = (
              await listAllRecords(client, board.board.appToken, board.board.tableId, 200)
            )
              .map((record) => toTaskRecord(record, board.fieldMap))
              .filter((task) => task.recordId && task.title);
            return jsonResult({
              board: board.key,
              label: board.board.label ?? board.key,
              url: board.board.url,
              counts: summarizeTasks(tasks),
            });
          },
        }),
      );

      registerTool(
        (ctx): AnyAgentTool => ({
          name: "taskboard_list_tasks",
          label: "Taskboard List Tasks",
          description: "List tasks from the current Hyper Claw Feishu taskboard.",
          parameters: Type.Object({
            boardKey: Type.Optional(Type.String()),
            status: Type.Optional(Type.String()),
            query: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
          }),
          async execute(_toolCallId, params) {
            if (!ctx.config) {
              return jsonResult({ error: "Tool config unavailable" });
            }
            const board = resolveTaskboardForTool(pluginConfig, ctx, params.boardKey);
            if (!board) {
              return jsonResult({ error: "No taskboard configured for the current agent/account" });
            }
            const client = createClient(ctx.config, board.board.accountId ?? ctx.agentAccountId);
            const tasks = (
              await listAllRecords(client, board.board.appToken, board.board.tableId, 200)
            )
              .map((record) => toTaskRecord(record, board.fieldMap))
              .filter((task) => task.recordId && task.title);
            const filtered = filterTasks(tasks, {
              status: params.status,
              query: params.query,
              limit: params.limit,
            });
            return jsonResult({
              board: board.key,
              total: tasks.length,
              tasks: filtered,
            });
          },
        }),
      );

      registerTool(
        (ctx): AnyAgentTool => ({
          name: "taskboard_add_task",
          label: "Taskboard Add Task",
          description: "Create a new task in the current Hyper Claw Feishu taskboard.",
          parameters: Type.Object({
            boardKey: Type.Optional(Type.String()),
            title: Type.String(),
            status: Type.Optional(Type.String()),
            priority: Type.Optional(Type.String()),
            owner: Type.Optional(Type.String()),
            dueAt: Type.Optional(Type.String()),
            source: Type.Optional(Type.String()),
            notes: Type.Optional(Type.String()),
          }),
          async execute(_toolCallId, params) {
            if (!ctx.config) {
              return jsonResult({ error: "Tool config unavailable" });
            }
            const board = resolveTaskboardForTool(pluginConfig, ctx, params.boardKey);
            if (!board) {
              return jsonResult({ error: "No taskboard configured for the current agent/account" });
            }
            const client = createClient(ctx.config, board.board.accountId ?? ctx.agentAccountId);
            const fields = buildRecordFields(board.fieldMap, {
              title: params.title,
              status: params.status ?? "待办",
              priority: params.priority,
              owner: params.owner,
              dueAt: params.dueAt,
              source: params.source,
              notes: params.notes,
            });
            const record = await createRecord(client, board, fields);
            return jsonResult({
              ok: true,
              board: board.key,
              recordId: normalizeOptionalString(record?.record_id),
            });
          },
        }),
      );

      registerTool(
        (ctx): AnyAgentTool => ({
          name: "taskboard_update_task",
          label: "Taskboard Update Task",
          description: "Update an existing task by record ID in the current Hyper Claw taskboard.",
          parameters: Type.Object({
            boardKey: Type.Optional(Type.String()),
            recordId: Type.String(),
            title: Type.Optional(Type.String()),
            status: Type.Optional(Type.String()),
            priority: Type.Optional(Type.String()),
            owner: Type.Optional(Type.String()),
            dueAt: Type.Optional(Type.String()),
            source: Type.Optional(Type.String()),
            notes: Type.Optional(Type.String()),
          }),
          async execute(_toolCallId, params) {
            if (!ctx.config) {
              return jsonResult({ error: "Tool config unavailable" });
            }
            const board = resolveTaskboardForTool(pluginConfig, ctx, params.boardKey);
            if (!board) {
              return jsonResult({ error: "No taskboard configured for the current agent/account" });
            }
            const fields = buildRecordFields(board.fieldMap, {
              title: params.title,
              status: params.status,
              priority: params.priority,
              owner: params.owner,
              dueAt: params.dueAt,
              source: params.source,
              notes: params.notes,
            });
            if (Object.keys(fields).length === 0) {
              return jsonResult({ error: "No fields provided for update" });
            }
            const client = createClient(ctx.config, board.board.accountId ?? ctx.agentAccountId);
            await updateRecord(client, board, params.recordId, fields);
            return jsonResult({ ok: true, board: board.key, recordId: params.recordId });
          },
        }),
      );

      registerTool(
        (ctx): AnyAgentTool => ({
          name: "taskboard_complete_task",
          label: "Taskboard Complete Task",
          description: "Mark a task as completed by record ID in the current Hyper Claw taskboard.",
          parameters: Type.Object({
            boardKey: Type.Optional(Type.String()),
            recordId: Type.String(),
            notes: Type.Optional(Type.String()),
          }),
          async execute(_toolCallId, params) {
            if (!ctx.config) {
              return jsonResult({ error: "Tool config unavailable" });
            }
            const board = resolveTaskboardForTool(pluginConfig, ctx, params.boardKey);
            if (!board) {
              return jsonResult({ error: "No taskboard configured for the current agent/account" });
            }
            const client = createClient(ctx.config, board.board.accountId ?? ctx.agentAccountId);
            const fields = buildRecordFields(board.fieldMap, {
              status: "已完成",
              notes: params.notes,
            });
            await updateRecord(client, board, params.recordId, fields);
            return jsonResult({ ok: true, board: board.key, recordId: params.recordId });
          },
        }),
      );

      const command: OpenClawPluginCommandDefinition = {
        name: "taskboard",
        description: "Manage Hyper Claw Feishu taskboards",
        acceptsArgs: true,
        handler: async (ctx) => {
          const args = (ctx.args ?? "").trim();
          if (!args) {
            return { text: buildHelpText() };
          }
          const [rawSubcommand = ""] = args.split(/\s+/, 1);
          const subcommand = rawSubcommand.trim().toLowerCase();
          const rest = args.slice(rawSubcommand.length).trim();

          if (subcommand === "help") {
            return { text: buildHelpText() };
          }

          if (subcommand === "link") {
            if (!rest) {
              return { text: "用法: /taskboard link <bitable-url>" };
            }
            const client = createClient(ctx.config, ctx.accountId);
            const linked = await resolveAppTokenFromUrl(client, rest);
            const boardKey = guessBoardKeyForWrite(pluginConfig, {
              config: ctx.config,
              channelId: ctx.channelId ?? ctx.channel,
              accountId: ctx.accountId,
            });
            const nextPluginConfig = buildNextPluginConfig(pluginConfig, boardKey, {
              label: linked.label ?? boardKey,
              agentId:
                resolveBindingAgentId(ctx.config, ctx.channelId ?? ctx.channel, ctx.accountId) ??
                resolveDefaultAgentId(ctx.config),
              accountId: ctx.accountId,
              url: rest,
              appToken: linked.appToken,
              tableId: linked.tableId,
              fieldMap: DEFAULT_FIELD_MAP,
            });
            await api.runtime.config.writeConfigFile(
              buildNextConfigWithPluginConfig(ctx.config, nextPluginConfig),
            );
            return {
              text: [
                `已绑定任务看板到 "${boardKey}"。`,
                `appToken: ${linked.appToken}`,
                `tableId: ${linked.tableId}`,
                "重启 gateway 后即可生效。",
              ].join("\n"),
            };
          }

          if (subcommand === "create") {
            const defaultName =
              resolveBindingAgentId(ctx.config, ctx.channelId ?? ctx.channel, ctx.accountId) ??
              ctx.accountId ??
              resolveDefaultAgentId(ctx.config) ??
              "Hyper Claw";
            const label = rest || `${defaultName} 任务看板`;
            const client = createClient(ctx.config, ctx.accountId);
            const created = await createTaskboardScaffold(client, label);
            const boardKey = guessBoardKeyForWrite(pluginConfig, {
              config: ctx.config,
              channelId: ctx.channelId ?? ctx.channel,
              accountId: ctx.accountId,
            });
            const nextPluginConfig = buildNextPluginConfig(pluginConfig, boardKey, {
              label,
              agentId:
                resolveBindingAgentId(ctx.config, ctx.channelId ?? ctx.channel, ctx.accountId) ??
                resolveDefaultAgentId(ctx.config),
              accountId: ctx.accountId,
              url: created.url,
              appToken: created.appToken,
              tableId: created.tableId,
              fieldMap: DEFAULT_FIELD_MAP,
            });
            await api.runtime.config.writeConfigFile(
              buildNextConfigWithPluginConfig(ctx.config, nextPluginConfig),
            );
            return {
              text: [
                `已创建任务看板 "${label}" 并绑定到 "${boardKey}"。`,
                created.url ? `URL: ${created.url}` : `appToken: ${created.appToken}`,
                `tableId: ${created.tableId}`,
                "重启 gateway 后即可生效。",
              ]
                .filter(Boolean)
                .join("\n"),
            };
          }

          if (subcommand === "status") {
            const { board, client } = await withCommandBoard(ctx);
            const tasks = (
              await listAllRecords(client, board.board.appToken, board.board.tableId, 200)
            )
              .map((record) => toTaskRecord(record, board.fieldMap))
              .filter((task) => task.recordId && task.title);
            return { text: buildBoardSummaryText(board, tasks) };
          }

          if (subcommand === "list") {
            const { board, client } = await withCommandBoard(ctx);
            const tasks = (
              await listAllRecords(client, board.board.appToken, board.board.tableId, 200)
            )
              .map((record) => toTaskRecord(record, board.fieldMap))
              .filter((task) => task.recordId && task.title);
            const filtered = filterTasks(tasks, {
              status: rest || "open",
              limit: 20,
            });
            return { text: formatTaskListText(board, filtered, tasks.length) };
          }

          return { text: buildHelpText() };
        },
      };

      api.registerCommand(command);
    },
  };
}

export { createTaskboardPlugin };
export default createTaskboardPlugin();
