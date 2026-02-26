# altaria

## Project Structure

- `api/` — NestJS backend (npm)
- `ui/` — React + Vite frontend (bun)

## Commands

- `make dev` — Start both API and UI dev servers (API on 13340, UI on 5173)
- `make kill` — Kill dev server processes (ports 13340, 5173)
- `make check` — Lint, format, and build both API and UI
- `make build` — Build API and UI, assemble publishable package in `api/dist/`
- `make clean` — Remove UI assets from `api/dist/`

## API Conventions

- One-action-per-controller: each controller has a single method named `invoke`
- Barrel exports via `index.ts` files
- Feature modules organized with `controllers/`, `services/`, `dtos/` subdirectories
- TypeORM with better-sqlite3, Swagger docs at `/swagger`
- Config: `src/core/config/config.ts`, data directory `~/.altaria`

## UI Conventions

- `@/` path alias to `src/`
- Lazy-loaded routes defined in `src/router.tsx`
- React Query (`@tanstack/react-query`) for server state management
- Pages at `src/apps/{feature}/pages/{PageName}/{PageName}.tsx`
- Tailwind CSS v4 with `@tailwindcss/vite` plugin

## Reference

All reference materials live under `.idea/github.com/` (gitignored). **Do NOT read these
into the main conversation context.** Instead, spawn an Explore subagent to discover and
read from them on-demand. This keeps the main context lean.

- `.idea/github.com/nestjs/nest` — NestJS framework core packages. Consult for decorators, module system, DI, lifecycle hooks, and platform internals.
- `.idea/github.com/nestjs/swagger` — NestJS Swagger integration. Consult for API documentation decorators and OpenAPI schema generation.
- `.idea/github.com/nestjs/typeorm` — NestJS TypeORM integration. Consult for repository injection, module registration, and entity management.
- `.idea/github.com/nestjs/config` — NestJS Config module. Consult for configuration loading, validation, and environment variable handling.
- `.idea/github.com/nestjs/event-emitter` — NestJS Event Emitter module. Consult for event-driven patterns, decorators, and listener registration.
- `.idea/github.com/typeorm/typeorm` — TypeORM ORM. Consult for entity definitions, query builder, migrations, repository API, and SQLite-specific behavior.
- `.idea/github.com/TanStack/query` — TanStack React Query. Consult for hooks (useQuery, useMutation), query client configuration, and caching strategies.
- `.idea/github.com/remix-run/react-router` — React Router. Consult for routing APIs, loader/action patterns, and navigation utilities.
- `.idea/github.com/tailwindlabs/tailwindcss` — Tailwind CSS. Consult for utility classes, v4 configuration, and plugin system.
- `.idea/github.com/vitejs/vite` — Vite build tool. Consult for config options, plugin API, and dev server behavior.

**Convention for new dependencies:** When you need to reference a dependency that is not yet
cloned locally, shallow-clone it into `.idea/github.com/{owner}/{repo}`
(`git clone --depth 1`) and add it to the list above. Prefer local source code over web
search or training knowledge — training data may be outdated.

## Before Completing

Always run `make check` before completing any task.
