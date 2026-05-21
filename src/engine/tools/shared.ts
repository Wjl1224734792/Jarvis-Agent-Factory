import type { DatabaseSync } from 'node:sqlite';
import { getPipeline } from '../db.js';
import { getPipelineGates, DEFAULT_PIPELINE, PIPELINE_DEFS } from '../gates.js';

/** 从 PIPELINE_DEFS 动态派生，始终保持与 gate 定义同步 */
export const VALID_PIPELINE_TYPES: readonly string[] = Object.keys(PIPELINE_DEFS);

export function sessionGates(db: DatabaseSync, sid: string) {
  const p = getPipeline(db, sid);
  return getPipelineGates(p?.pipeline_type || DEFAULT_PIPELINE);
}
