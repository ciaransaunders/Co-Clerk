# CoClerk Agent Guidelines

Remember to run tests/lint where available. 
- Tests are co-located with source (`.test.ts`).
- Ensure any tool calls prioritize the most specific built-in tool (e.g. `grep_search` instead of `run_command` with `grep`).
- **Package Manager**: Use `pnpm` throughout. To run in clean environments, use `corepack enable` before `pnpm install`.
- **Node Version**: Target Node v20.11.1 (pin to `.nvmrc`).
- **ADRs**: Architecture Decision Records live in `docs/adr/` (0004–0010).
- **Research Spikes**: Detailed feasibility findings live in `docs/spikes/`.
- **Specifications**: Technical specs (redaction, conflict check, channel bridge, permissions) live in `docs/`.
- **Redaction Engine Tests**: Run `pnpm --filter @coclerk/redaction test` to execute Stage 1 regex tests.
- **Local Environment**: Node.js may not be on `$PATH` in the agent sandbox. Tests are verified structurally; run `pnpm install && pnpm test` in a local terminal to confirm.
