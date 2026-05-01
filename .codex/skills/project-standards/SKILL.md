---
name: project-standards
description: "Repository-wide standards loader for all agents in E:/CodeStore/feijia. Use before any analysis, planning, review, implementation, debugging, delivery, or delegated agent task to read and follow AGENTS.md, relevant .codex/skills, and mandatory .codex/rules files."
---

# Project Standards

Use this skill as the repository-level entry point for mandatory agent standards. Keep detailed rules in their source files; do not duplicate their full text into agent prompts, plans, implementation notes, or final replies.

## Mandatory Reading

Before any analysis, planning, review, implementation, debugging, delivery, or delegated subtask, read and follow:

1. Root `AGENTS.md`, then any relevant subdirectory `AGENTS.md`.
2. `.codex/rules/通用编程规范与指南.md`.
3. `.codex/rules/团队协作规范.md`.
4. `.codex/rules/TypeScript与Interface使用规范.md`.
5. Relevant skills under `.codex/skills/`.

## Skill Loading

Treat `.codex/skills/` as the local skill registry.

- Inspect skill names and descriptions for the current task.
- If a skill may apply, read that skill's `SKILL.md` and follow it.
- Load only relevant skill bodies and referenced files; do not bulk-read unrelated skills just to say they were read.
- When a task is delegated, include the relevant skill names or paths in the handoff packet.

## Rule Priority

When instructions conflict, use this order:

1. Direct system, developer, and user instructions.
2. Root `AGENTS.md`.
3. Relevant subdirectory `AGENTS.md`.
4. Mandatory files under `.codex/rules/`.
5. Relevant `.codex/skills/` instructions and workflow references.
6. Local code style and surrounding implementation patterns.

If a conflict affects the work, stop and report the conflict instead of silently choosing a risky interpretation.

## Operating Requirements

- Use Chinese for communication, comments, and documentation unless an external API, existing file style, or user instruction requires otherwise.
- Keep changes inside the user-requested scope and remove only unused symbols introduced by the current diff.
- For TypeScript object shapes, prefer `interface`; use `type` for unions, tuples, mapped or conditional types, utility-type expressions, and primitive aliases.
- For schemas derived from external data, prefer Zod schema as the runtime contract and use inferred types instead of duplicating request or response types.
- For meaningful code changes, run the relevant validation commands required by `AGENTS.md` and the rule files, or clearly state why they were not run.
