# Карта Reference-Layer

`references/` содержит полный методологический слой по проектированию агентных харнессов.

## Что читать первым

- Новый агент или MVP: `references/mvp-agent-blueprint.md`.
- Архитектура харнесса: `references/architecture.md`.
- Runtime loop: `references/agentic-loop.md`.
- Tools и approvals: `references/tools-and-permissions.md`.
- Context, memory, compaction: `references/context-memory-compaction.md`.
- Provider adapters: `references/provider-api-patterns.md`.
- Security, evals, observability: `references/security-evals-observability.md`.

## Что покрывает слой

- maturity levels от answer-only до long-running goal worker;
- provider-neutral model-tool-observation loop;
- risk taxonomy и permission matrix;
- draft/commit split;
- context tiers, retrieval, trust labels;
- compaction и rehydration;
- prompt caching и cost telemetry;
- planning mode и goal loops;
- Agent Skills, MCP, connectors;
- system/developer/user/scoped instructions;
- OpenAI, Anthropic, OpenAI-compatible API patterns;
- guardrails, evals, launch gates, incident response;
- agent-readable environments and feedback loops.

## Как это связано с кодом

`references/` задаёт правила. `src/runtime/` реализует минимальный исполняемый каркас:

- `harness.js` реализует loop;
- `tool-registry.js` реализует typed tools;
- `permission-engine.js` реализует approval gates;
- `state-store.js` хранит durable state;
- `context-builder.js` собирает prompt context;
- `trace-recorder.js` пишет events;
- `eval-runner.js` запускает executable checks.
