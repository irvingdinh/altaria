# altaria

## Project Structure

- `api/` — NestJS backend (npm)
- `ui/` — React + Vite frontend (bun)

## Commands

- `make dev` — Start both API and UI dev servers
- `make kill` — Kill dev server processes (ports 3000, 5173)
- `make check` — Lint, format, and build both API and UI

## API Conventions

- One-action-per-controller: each controller has a single method named `invoke`
- Barrel exports via `index.ts` files
- Feature modules organized with `controllers/`, `services/`, `dtos/` subdirectories
- TypeORM with SQLite, Swagger docs at `/swagger`
- Config: `src/core/config/config.ts`, data directory `~/.altaria`

## UI Conventions

- `@/` path alias to `src/`
- Lazy-loaded routes defined in `src/router.tsx`
- React Query (`@tanstack/react-query`) for server state management
- Pages at `src/apps/{feature}/pages/{PageName}/{PageName}.tsx`
- Tailwind CSS v4 with `@tailwindcss/vite` plugin

## Before Completing

Always run `make check` before completing any task.
