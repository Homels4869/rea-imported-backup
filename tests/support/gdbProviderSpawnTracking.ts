import {
  spawnOwnedProviderProcess,
  type OwnedProviderProcessSpawnOptions,
  type SpawnedOwnedProviderProcess,
} from "../../src/process/ProviderProcess.js";

/**
 * Track real fake-provider children so a test that intentionally retains debugger
 * ownership cannot leak the process it spawned into the developer's machine.
 */
export const createProviderSpawnTracker = (): {
  readonly spawnProcess: (
    options: OwnedProviderProcessSpawnOptions,
  ) => Promise<SpawnedOwnedProviderProcess>;
  readonly killSurvivors: () => void;
} => {
  const leaderPids = new Set<number>();
  return {
    spawnProcess: async (options) => {
      const spawned = await spawnOwnedProviderProcess(options);
      leaderPids.add(spawned.ownership.leaderPid);
      return spawned;
    },
    killSurvivors: () => {
      for (const pid of leaderPids) {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          // The owned process group may already be gone.
        }
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // The leader may already have exited.
        }
      }
      leaderPids.clear();
    },
  };
};
