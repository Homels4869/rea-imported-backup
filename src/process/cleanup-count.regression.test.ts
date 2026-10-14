import { expect, it, vi } from "vitest";
import { cleanupOwnedProcessGroup, type ProcessOwnershipHost } from "./ProcessOwnership.js";

it("counts one live unreadable child once", async () => {
  const rows = [
    { pid: 100, parentPid: 1, processGroupId: 100, state: "S", command: "capture" },
    { pid: 101, parentPid: 100, processGroupId: 100, state: "S", command: "child" },
  ];
  const signalGroup = vi.fn();
  const host: ProcessOwnershipHost = {
    listProcesses: async () => rows,
    environment: async () => ({}),
    runTokens: async (members) => new Map(members.map(({ pid }) => [pid,
      pid === 100
        ? { state: "readable" as const, runId: "capture-token" }
        : { state: "unavailable" as const, reason: "environment_unavailable" },
    ])),
    signalGroup,
  };
  const result = await cleanupOwnedProcessGroup({
    runId: "capture-token", leaderPid: 100, processGroupId: 100,
    sweepTokenOwnedProcesses: true, captureBaseline: [],
  }, host);
  expect(signalGroup).not.toHaveBeenCalled();
  expect(result.cleaned).toBe(false);
  if (result.cleaned) throw new Error("cleanup unexpectedly succeeded");
  expect(result.failures).toHaveLength(1);
  expect(result.reason).toContain("1 live process(es)");
});

it("keeps one failure per PID for two distinct unreadable children", async () => {
  const rows = [
    { pid: 100, parentPid: 1, processGroupId: 100, state: "S", command: "capture" },
    { pid: 101, parentPid: 100, processGroupId: 100, state: "S", command: "child-a" },
    { pid: 102, parentPid: 100, processGroupId: 100, state: "S", command: "child-b" },
  ];
  const signalGroup = vi.fn();
  const host: ProcessOwnershipHost = {
    listProcesses: async () => rows,
    environment: async () => ({}),
    runTokens: async (members) => new Map(members.map(({ pid }) => [pid,
      pid === 100
        ? { state: "readable" as const, runId: "capture-token" }
        : { state: "unavailable" as const, reason: "environment_unavailable" },
    ])),
    signalGroup,
  };
  const result = await cleanupOwnedProcessGroup({
    runId: "capture-token", leaderPid: 100, processGroupId: 100,
    sweepTokenOwnedProcesses: true, captureBaseline: [],
  }, host);
  expect(signalGroup).not.toHaveBeenCalled();
  expect(result.cleaned).toBe(false);
  if (result.cleaned) throw new Error("cleanup unexpectedly succeeded");
  expect(result.failures?.map(({ pid }) => pid).sort((left, right) => left - right)).toEqual([101, 102]);
  expect(result.reason).toContain("2 live process(es)");
});
