.PHONY: dev kill

dev: kill
	trap 'kill 0' EXIT; cd ./app && bun run index.ts & cd ./ui && bun run dev & wait

kill:
	@lsof -ti :23340 | xargs kill -15 2>/dev/null || true
	@lsof -ti :5173 | xargs kill -15 2>/dev/null || true
