import type { UploadBatchMode, UploadBatchResult, UploadTask } from "./types";

function pushResult<T>(result: UploadBatchResult<T>, slot: string, value: T) {
  if (!result[slot]) {
    result[slot] = [];
  }
  result[slot].push(value);
}

export async function runUploadBatch<T>(
  tasks: UploadTask<T>[],
  mode: UploadBatchMode = "parallel"
): Promise<UploadBatchResult<T>> {
  if (tasks.length === 0) {
    return {};
  }

  if (mode === "serial") {
    const result: UploadBatchResult<T> = {};
    for (const task of tasks) {
      const value = await task.run(task.file);
      pushResult(result, task.slot, value);
    }
    return result;
  }

  const pairs = await Promise.all(
    tasks.map(async (task) => ({
      slot: task.slot,
      value: await task.run(task.file)
    }))
  );
  const result: UploadBatchResult<T> = {};
  for (const pair of pairs) {
    pushResult(result, pair.slot, pair.value);
  }
  return result;
}
