.PHONY: dev kill check check-api check-ui

check:
	$(MAKE) -j2 check-api check-ui

check-api:
	cd api && npm run format && npm run lint && npm run build

check-ui:
	cd ui && bun run lint && bun run build

kill:
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti :5173 | xargs kill -9 2>/dev/null || true

dev: kill
	cd api && npm start & cd ui && bun dev
