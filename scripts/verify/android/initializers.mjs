import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { parseEvidence } from "../../../dist/domain/evidence.js";
import { hashAndroidFile } from "./digest.mjs";

/** Verify folded field assignments and remaining static-block calls through both public adapters. */
export const verifyAndroidInitializers = async ({
  apk,
  repository,
  entrypoint,
  environment,
  execute,
}) => {
  const digest = await hashAndroidFile(apk);
  const cases = [
    {
      class_name: "fixture.InitializationPolicy",
      witnesses: [
        "declared-policy",
        "->singletonList",
        "->POLICY:Ljava/util/List;",
      ],
    },
    {
      class_name: "fixture.MixedInitialization",
      witnesses: ["field-value", "->LABEL:Ljava/lang/String;", "->touch()V"],
    },
  ];
  const check = (value, scenario) => {
    const evidence = parseEvidence(value);
    assert.equal(evidence.subject.digest.sha256, digest);
    const result = evidence.normalized_result;
    assert.equal(result.class_name, scenario.class_name);
    assert.equal(result.method.name, "<clinit>");
    assert.equal(result.overload_count, 1);
    assert.equal(result.body_status, "available");
    assert.equal(result.representation, "smali");
    assert.equal(result.fell_back, true);
    assert.ok(result.markers.includes("static_initializer_disassembly"));
    assert.equal(result.source.status, "complete");
    for (const witness of scenario.witnesses)
      assert.ok(
        result.source.text.includes(witness),
        `Missing initializer evidence: ${witness}`,
      );
    return evidence;
  };
  const flagCases = [
    {
      operation: "inspect_android_class",
      args: [],
      input: {},
      check: (result) => {
        const methods = new Map(
          result.methods.map((method) => [method.name, method]),
        );
        assert.equal(methods.get("nativeCall").access_flags, 0x101);
        assert.deepEqual(methods.get("nativeCall").access_flag_names, [
          "public",
          "native",
        ]);
        assert.equal(methods.get("missing").access_flags, 0x401);
        assert.deepEqual(methods.get("missing").access_flag_names, [
          "public",
          "abstract",
        ]);
        assert.equal(methods.get("generated").access_flags, 0x1049);
        assert.deepEqual(methods.get("generated").access_flag_names, [
          "public",
          "static",
          "bridge",
          "synthetic",
        ]);
      },
    },
    ...[
      ["nativeCall", "native"],
      ["missing", "abstract"],
      ["generated", null],
    ].map(([method, reason]) => ({
      operation: "inspect_android_method",
      args: [method],
      input: { method_name: method },
      check: (result) => {
        assert.equal(result.body_unavailable_reason, reason);
        assert.equal(
          result.body_status,
          reason === null ? "available" : "not_available",
        );
        if (reason !== null) assert.equal(result.source.text, "");
      },
    })),
  ];
  const flagEvidence = [];
  for (const scenario of flagCases) {
    const response = await execute(
      process.execPath,
      [
        entrypoint,
        scenario.operation.replaceAll("_", "-"),
        apk,
        "fixture.AccessFlags",
        ...scenario.args,
        "--format",
        "json",
      ],
      {
        cwd: repository,
        env: environment,
        timeout: 150_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    const evidence = parseEvidence(JSON.parse(response.stdout));
    assert.equal(evidence.subject.digest.sha256, digest);
    scenario.check(evidence.normalized_result);
    flagEvidence.push(evidence);
  }
  const cli = new Map();
  for (const scenario of cases) {
    const response = await execute(
      process.execPath,
      [
        entrypoint,
        "inspect-android-method",
        apk,
        scenario.class_name,
        "<clinit>",
        "--format",
        "json",
      ],
      {
        cwd: repository,
        env: environment,
        timeout: 150_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    cli.set(scenario.class_name, check(JSON.parse(response.stdout), scenario));
  }
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entrypoint, "mcp"],
    cwd: repository,
    env: environment,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const client = new Client({
    name: "rea-real-android-initializers",
    version: "1",
  });
  try {
    await client.connect(transport, { timeout: 30_000 });
    for (const scenario of cases) {
      const response = await client.callTool(
        {
          name: "inspect_android_method",
          arguments: {
            path: apk,
            class_name: scenario.class_name,
            method_name: "<clinit>",
          },
        },
        { timeout: 150_000 },
      );
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const evidence = check(response.structuredContent, scenario);
      assert.deepEqual(
        evidence.normalized_result,
        cli.get(scenario.class_name).normalized_result,
      );
      assert.deepEqual(
        evidence.parameters,
        cli.get(scenario.class_name).parameters,
      );
      assert.deepEqual(
        evidence.provider,
        cli.get(scenario.class_name).provider,
      );
    }
    for (const [index, scenario] of flagCases.entries()) {
      const response = await client.callTool(
        {
          name: scenario.operation,
          arguments: {
            path: apk,
            class_name: "fixture.AccessFlags",
            ...scenario.input,
          },
        },
        { timeout: 150_000 },
      );
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const evidence = parseEvidence(response.structuredContent);
      assert.equal(evidence.subject.digest.sha256, digest);
      scenario.check(evidence.normalized_result);
      assert.deepEqual(
        evidence.normalized_result,
        flagEvidence[index].normalized_result,
      );
    }
    await client.ping();
  } catch (cause) {
    process.stderr.write(stderr);
    throw cause;
  } finally {
    await client.close();
  }
  assert.equal(
    await hashAndroidFile(apk),
    digest,
    "Static inspection changed fixture bytes",
  );
  console.log(
    "PASS real CLI/MCP static initializer and access-flag evidence, identity, parity and unchanged APK",
  );
};
