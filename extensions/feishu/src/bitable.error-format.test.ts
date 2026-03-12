import type { OpenClawPluginApi } from "openclaw/plugin-sdk/feishu";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { registerFeishuBitableTools } from "./bitable.js";
import { createToolFactoryHarness } from "./tool-factory-test-harness.js";

const createFeishuToolClientMock = vi.fn();

vi.mock("./tool-account.js", () => ({
  createFeishuToolClient: (params: unknown) => createFeishuToolClientMock(params),
}));

function createConfig(): OpenClawPluginApi["config"] {
  return {
    channels: {
      feishu: {
        enabled: true,
        accounts: {
          default: {
            appId: "app-default",
            appSecret: "sec-default", // pragma: allowlist secret
          },
        },
      },
    },
  } as OpenClawPluginApi["config"];
}

function createFailingClient(error: unknown) {
  return {
    bitable: {
      appTableRecord: {
        list: vi.fn().mockRejectedValue(error),
      },
    },
  };
}

describe("registerFeishuBitableTools error formatting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("includes Feishu response code and msg for axios-style errors", async () => {
    const axiosError = Object.assign(new Error("Request failed with status code 400"), {
      response: {
        data: { code: 91402, msg: "NOTEXIST", data: {} },
      },
    });
    createFeishuToolClientMock.mockReturnValue(createFailingClient(axiosError));

    const { api, resolveTool } = createToolFactoryHarness(createConfig());
    registerFeishuBitableTools(api);

    const tool = resolveTool("feishu_bitable_list_records");
    const result = (await tool.execute("call", {
      app_token: "bad-token",
      table_id: "tbl_bad",
    })) as { details?: { error?: string } };

    expect(result.details?.error).toBe(
      "Request failed with status code 400 [code=91402 msg=NOTEXIST]",
    );
  });

  test("includes Feishu response code and msg for sdk array-style errors", async () => {
    createFeishuToolClientMock.mockReturnValue(
      createFailingClient([
        {
          message: "Request failed with status code 400",
        },
        {
          code: 91402,
          msg: "NOTEXIST",
          data: {},
        },
      ]),
    );

    const { api, resolveTool } = createToolFactoryHarness(createConfig());
    registerFeishuBitableTools(api);

    const tool = resolveTool("feishu_bitable_list_records");
    const result = (await tool.execute("call", {
      app_token: "bad-token",
      table_id: "tbl_bad",
    })) as { details?: { error?: string } };

    expect(result.details?.error).toBe(
      "Request failed with status code 400 [code=91402 msg=NOTEXIST]",
    );
  });
});
