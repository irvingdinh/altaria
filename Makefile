.PHONY: dev kill check check-api check-ui build clean publish

check:
	$(MAKE) -j2 check-api check-ui

check-api:
	cd api && npm run format && npm run lint && npm run build

check-ui:
	cd ui && bun run lint && bun run build

kill:
	@lsof -ti :13340 | xargs kill -9 2>/dev/null || true
	@lsof -ti :5173 | xargs kill -9 2>/dev/null || true

dev: kill
	cd api && npm start & cd ui && bun dev

clean:
	rm -rf api/dist/ui

build: clean
	cd api && npm run build
	cd ui && bun run build
	cp -r ui/dist api
	printf '#!/usr/bin/env node\n' | cat - api/dist/cli.js > api/dist/cli.tmp
	mv api/dist/cli.tmp api/dist/cli.js
	chmod +x api/dist/cli.js

publish:
	cd api && npm version patch --no-git-tag-version
	$(MAKE) build
	cd api && npm publish
