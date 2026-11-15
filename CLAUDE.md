# CLAUDE.md — EcommercePlatform

Read and follow `AGENTS.md` at the repository root. It is the shared source of project rules; do not duplicate or contradict it.

## Claude-specific working rules
- Before acting, inspect `git status`, the current branch, and the relevant project files.
- Keep responses and plans concise. Do not restate the full project architecture unless needed.
- Do not scan the entire repository repeatedly. Start with relevant files and expand only when dependencies require it.
- Prefer targeted searches (`rg`, package scripts, config inspection) over dumping large files.
- Do not read generated output, `node_modules`, `.next`, build artifacts, or lockfiles in full unless debugging requires it.
- Reuse existing scripts, conventions, packages, and tooling.
- Ask before destructive changes, broad refactors, backend modifications, or changes that could disrupt another agent's work.
- Never run two agents against the same working tree when both may edit files.
- Do not claim a build, test, CI workflow, or Vercel deployment passed unless you actually ran or observed it.
- If credentials or external access are unavailable, document the exact manual step and mark it NOT VERIFIED.

## Token-efficient execution
1. Start with a brief audit, not a long explanation.
2. Make a short implementation plan with only necessary steps.
3. Work in small, coherent batches.
4. Avoid repeating unchanged context or printing entire files.
5. Show only relevant diffs and concise command results.
6. Do not generate documentation that repeats `AGENTS.md`; document implementation-specific details only.
7. At the end, provide a compact completion report using the headings in `AGENTS.md`.

## Current handoff
The first agent is completing Phase 4 (Khosheh storefront). Do not start the independent-deployment implementation until that work is complete and committed. Then use a separate branch/worktree, audit the existing setup, and implement only verified gaps.
