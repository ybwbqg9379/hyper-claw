import type * as Lark from "@larksuiteoapi/node-sdk";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { describe, expect, it, vi } from "vitest";
import type {
  OpenClawPluginCommandDefinition,
  PluginCommandContext,
} from "../../src/plugins/types.js";
import { createTestPluginApi } from "../../test/helpers/plugins/plugin-api.js";
import { createTaskboardPlugin } from "./index.js";

type MutableConfig = Record<string, unknown>;

function createFakeClient() {
  return {
    wiki: {
      space: {
        getNode: vi.fn(),
      },
    },
    bitable: {
      app: {
        get: vi.fn(),
        create: vi.fn(),
      },
      appTable: {
        list: vi.fn(),
      },
      appTableField: {
        list: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        create: vi.fn(),
      },
      appTableRecord: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        batchDelete: vi.fn(),
      },
    },
  };
}

function createApi(params: {
  config: MutableConfig;
  writeConfig: (next: MutableConfig) => Promise<void>;
  registerCommand: (command: OpenClawPluginCommandDefinition) => void;
  registerTool: (tool: unknown) => void;
}): OpenClawPluginApi {
  return createTestPluginApi({
    id: "hyper-claw-taskboard",
    name: "hyper-claw-taskboard",
    source: "test",
    config: params.config as OpenClawPluginApi["config"],
    pluginConfig: {},
    runtime: {
      config: {
        loadConfig: () => params.config,
        writeConfigFile: params.writeConfig,
      },
    } as OpenClawPluginApi["runtime"],
    registerTool: params.registerTool as OpenClawPluginApi["registerTool"],
    registerCommand: params.registerCommand,
  }) as OpenClawPluginApi;
}

function createCommandContext(params?: Partial<PluginCommandContext>): PluginCommandContext {
  return {
    channel: "feishu",
    channelId: "feishu",
    accountId: "hypercreator",
    isAuthorizedSender: true,
    commandBody: "/taskboard",
    config: {} as PluginCommandContext["config"],
    requestConversationBinding: async () => ({
      status: "error",
      message: "unsupported",
    }),
    detachConversationBinding: async () => ({ removed: false }),
    getCurrentConversationBinding: async () => null,
    ...params,
  };
}

describe("hyper-claw-taskboard plugin", () => {
  it("links the current account to a persisted board config", async () => {
    const client = createFakeClient();
    client.bitable.app.get.mockResolvedValue({
      code: 0,
      data: { app: { name: "HyperCreator Board" } },
    });

    let nextConfig: MutableConfig | undefined;
    let command: OpenClawPluginCommandDefinition | undefined;

    const config: MutableConfig = {
      agents: {
        list: [{ id: "personal", default: true }, { id: "hypercreator" }],
      },
      bindings: [
        {
          agentId: "hypercreator",
          match: { channel: "feishu", accountId: "hypercreator" },
        },
      ],
      plugins: {
        allow: ["feishu"],
        entries: {
          feishu: { enabled: true },
        },
      },
    };

    createTaskboardPlugin({
      createClient: () => client as unknown as Lark.Client,
    }).register?.(
      createApi({
        config,
        writeConfig: async (next) => {
          nextConfig = next;
        },
        registerCommand: (next) => {
          command = next;
        },
        registerTool: () => {},
      }),
    );

    await command?.handler(
      createCommandContext({
        config,
        args: "link https://example.feishu.cn/base/appABC123?table=tblXYZ",
        commandBody: "/taskboard link https://example.feishu.cn/base/appABC123?table=tblXYZ",
      }),
    );

    const plugins = (nextConfig?.plugins as Record<string, unknown> | undefined) ?? {};
    const allow = (plugins.allow as string[] | undefined) ?? [];
    const entries = (plugins.entries as Record<string, unknown> | undefined) ?? {};
    const taskboardEntry =
      (entries["hyper-claw-taskboard"] as Record<string, unknown> | undefined) ?? {};
    const taskboardConfig =
      (taskboardEntry.config as { boards?: Record<string, Record<string, unknown>> } | undefined) ??
      {};

    expect(allow).toContain("hyper-claw-taskboard");
    expect(taskboardEntry.enabled).toBe(true);
    expect(taskboardConfig.boards?.hypercreator?.appToken).toBe("appABC123");
    expect(taskboardConfig.boards?.hypercreator?.tableId).toBe("tblXYZ");
    expect(taskboardConfig.boards?.hypercreator?.accountId).toBe("hypercreator");
  });

  it("creates a scaffolded board and stores it under the bound agent key", async () => {
    const client = createFakeClient();
    client.bitable.app.create.mockResolvedValue({
      code: 0,
      data: { app: { app_token: "appNEW", url: "https://example.feishu.cn/base/appNEW" } },
    });
    client.bitable.appTable.list.mockResolvedValue({
      code: 0,
      data: { items: [{ table_id: "tblNEW" }] },
    });
    client.bitable.appTableField.list.mockResolvedValue({
      code: 0,
      data: {
        items: [
          { field_id: "fld-primary", field_name: "Name", is_primary: true, type: 1 },
          { field_id: "fld-status", field_name: "状态", is_primary: false, type: 3 },
        ],
      },
    });
    client.bitable.appTableField.update.mockResolvedValue({ code: 0, data: {} });
    client.bitable.appTableField.delete.mockResolvedValue({ code: 0, data: {} });
    client.bitable.appTableField.create.mockResolvedValue({ code: 0, data: {} });
    client.bitable.appTableRecord.list.mockResolvedValue({ code: 0, data: { items: [] } });
    client.bitable.appTableRecord.batchDelete.mockResolvedValue({ code: 0, data: {} });

    let nextConfig: MutableConfig | undefined;
    let command: OpenClawPluginCommandDefinition | undefined;

    const config: MutableConfig = {
      agents: {
        list: [{ id: "personal", default: true }, { id: "hypercreator" }],
      },
      bindings: [
        {
          agentId: "hypercreator",
          match: { channel: "feishu", accountId: "hypercreator" },
        },
      ],
      plugins: {
        allow: ["feishu"],
        entries: {
          feishu: { enabled: true },
        },
      },
    };

    createTaskboardPlugin({
      createClient: () => client as unknown as Lark.Client,
    }).register?.(
      createApi({
        config,
        writeConfig: async (next) => {
          nextConfig = next;
        },
        registerCommand: (next) => {
          command = next;
        },
        registerTool: () => {},
      }),
    );

    const result = await command?.handler(
      createCommandContext({
        config,
        args: "create HyperCreator 任务看板",
        commandBody: "/taskboard create HyperCreator 任务看板",
      }),
    );

    const taskboardConfig = (
      (
        (nextConfig?.plugins as Record<string, unknown> | undefined)?.entries as
          | Record<string, unknown>
          | undefined
      )?.["hyper-claw-taskboard"] as
        | { config?: { boards?: Record<string, Record<string, unknown>> } }
        | undefined
    )?.config;

    expect(String(result?.text ?? "")).toContain("HyperCreator 任务看板");
    expect(client.bitable.appTableField.update).toHaveBeenCalledOnce();
    expect(client.bitable.appTableField.create).toHaveBeenCalledTimes(5);
    expect(taskboardConfig?.boards?.hypercreator?.appToken).toBe("appNEW");
    expect(taskboardConfig?.boards?.hypercreator?.tableId).toBe("tblNEW");
    expect(taskboardConfig?.boards?.hypercreator?.url).toBe(
      "https://example.feishu.cn/base/appNEW",
    );
  });

  it("lists open tasks for the current agent via the tool factory", async () => {
    const client = createFakeClient();
    client.bitable.appTableRecord.list.mockResolvedValue({
      code: 0,
      data: {
        items: [
          {
            record_id: "rec-open",
            fields: {
              任务名称: "准备周报",
              状态: "待办",
              优先级: "P1-高",
              负责人: "Bao",
            },
          },
          {
            record_id: "rec-done",
            fields: {
              任务名称: "清理旧草稿",
              状态: "已完成",
              优先级: "P3-低",
              负责人: "Bao",
            },
          },
        ],
        has_more: false,
      },
    });

    const toolRegistrations: unknown[] = [];
    const config: MutableConfig = {
      agents: {
        list: [{ id: "personal", default: true }],
      },
    };

    createTaskboardPlugin({
      createClient: () => client as unknown as Lark.Client,
    }).register?.({
      ...createApi({
        config,
        writeConfig: async () => {},
        registerCommand: () => {},
        registerTool: (tool) => toolRegistrations.push(tool),
      }),
      pluginConfig: {
        defaultBoard: "personal",
        boards: {
          personal: {
            label: "Personal Board",
            agentId: "personal",
            accountId: "personal",
            appToken: "app-personal",
            tableId: "tbl-personal",
          },
        },
      },
    });

    const listToolFactory = toolRegistrations[1] as (ctx: {
      config?: OpenClawPluginApi["config"];
      agentId?: string;
      agentAccountId?: string;
    }) => { execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown> };
    const tool = listToolFactory({
      config: config as unknown as OpenClawPluginApi["config"],
      agentId: "personal",
      agentAccountId: "personal",
    });

    const result = (await tool.execute("call-1", { status: "open" })) as {
      details?: { tasks?: Array<{ recordId: string }> };
    };

    expect(result.details?.tasks).toEqual([expect.objectContaining({ recordId: "rec-open" })]);
  });
});
