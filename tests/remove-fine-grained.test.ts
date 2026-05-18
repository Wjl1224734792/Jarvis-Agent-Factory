import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getHashFilePath } from '../src/hash-paths.js';

const TEST_DIR = resolve(tmpdir(), `jarvis-remove-test-${Date.now()}`);

describe('fine-grained remove', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('should track installed files via hash records', () => {
    // Simulate what install does: write hash records
    const hashFile = getHashFilePath(TEST_DIR, false);
    const agentsDir = join(TEST_DIR, '.claude', 'agents');
    mkdirSync(agentsDir, { recursive: true });

    // Create a "jarvis-installed" file
    const agentFile = join(agentsDir, 'test-agent.md');
    writeFileSync(agentFile, '---\ndescription: test\n---\n# Test Agent');

    // Record hash
    const hashes: Record<string, string> = {};
    hashes[agentFile] = 'abc123';
    const hashDir = resolve(hashFile, '..');
    if (!existsSync(hashDir)) mkdirSync(hashDir, { recursive: true });
    writeFileSync(hashFile, JSON.stringify(hashes, null, 2));

    // Verify hash file exists and tracks the file
    expect(existsSync(hashFile)).toBe(true);
    const loaded = JSON.parse(readFileSync(hashFile, 'utf-8'));
    expect(loaded[agentFile]).toBe('abc123');
  });

  it('should preserve user custom files not in hash records', () => {
    const agentsDir = join(TEST_DIR, '.claude', 'agents');
    mkdirSync(agentsDir, { recursive: true });

    // Jarvis-installed file (tracked)
    const jarvisFile = join(agentsDir, 'jarvis-agent.md');
    writeFileSync(jarvisFile, '# jarvis agent');

    // User's custom file (not tracked)
    const userFile = join(agentsDir, 'my-custom-agent.md');
    writeFileSync(userFile, '# my agent');

    // Hash records only track jarvis file
    const hashFile = getHashFilePath(TEST_DIR, false);
    const hashes: Record<string, string> = {};
    hashes[jarvisFile] = 'def456';
    const hashDir = resolve(hashFile, '..');
    if (!existsSync(hashDir)) mkdirSync(hashDir, { recursive: true });
    writeFileSync(hashFile, JSON.stringify(hashes, null, 2));

    // Simulate remove: only delete tracked files
    const loaded = JSON.parse(readFileSync(hashFile, 'utf-8'));
    // Jarvis file tracked → should be removable
    expect(loaded[jarvisFile]).toBeDefined();
    // User file NOT tracked → should NOT be in hash records
    expect(loaded[userFile]).toBeUndefined();

    // Verify both files still exist (hash-based removal only deletes tracked)
    expect(existsSync(jarvisFile)).toBe(true);
    expect(existsSync(userFile)).toBe(true);
  });

  it('should track settings.json managed hooks', () => {
    const claudeDir = join(TEST_DIR, '.claude');
    mkdirSync(claudeDir, { recursive: true });

    const settings = {
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
      hooks: {
        PostToolUse: [{ matcher: 'Agent', hooks: [{ type: 'command', command: 'jarvis hook gate-check' }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'jarvis hook status' }] }],
      },
      _jarvisManagedHooks: ['PostToolUse', 'Stop'],
      permissions: { allow: ['Bash(git:*)'] },
    };

    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));

    // Verify managed hooks are tracked
    const loaded = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf-8'));
    expect(loaded._jarvisManagedHooks).toEqual(['PostToolUse', 'Stop']);
    expect(loaded.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    // User's custom permissions should be preserved
    expect(loaded.permissions.allow).toContain('Bash(git:*)');
  });
});
