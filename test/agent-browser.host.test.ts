import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { NativeBrowserHost } from "../extensions/agent-browser/index.js";
import { createExtensionHarness, executeRegisteredTool, withPatchedEnv, writeFakeAgentBrowserBinary } from "./helpers/agent-browser-harness.js";

test("host browser calls use the registered agent_browser execution path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-browser-host-"));
  try {
    await writeFakeAgentBrowserBinary(dir, 'process.stdout.write("agent-browser 0.38.1\\n");');
    await withPatchedEnv({ PATH: `${dir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      let host: NativeBrowserHost | undefined;
      const harness = createExtensionHarness({ cwd: dir, onHostReady(ready) { host = ready; } });
      assert.ok(host);
      const direct = await executeRegisteredTool(harness.tool, harness.ctx, { args: ["--version"] });
      const delegated = await host.execute({ toolCallId: "host-version", args: ["--version"], signal: new AbortController().signal, ctx: harness.ctx as ExtensionContext });
      assert.equal(delegated.isError, direct.isError);
      assert.deepEqual(delegated.content, direct.content);
      assert.match(delegated.content[0]?.type === "text" ? delegated.content[0].text : "", /0\.38\.1/);
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
