.PHONY: e2e e2e-ready

# IMP-M8-16: the browser acceptance suite, against the compose stack that `make up` starts in
# turnbase-platform (a sibling checkout). CI runs no browser e2e — it needs the full stack
# (FR-CICD-005, conventions.md §3) — so this is the way to run it, by hand or from a scheduled
# job that has the stack.
PLATFORM_DIR ?= ../turnbase-platform
PLATFORM_URL ?= http://turnbase.localhost:8080

# Fails early, with the cause, when the stack is not up.
e2e-ready:
	@curl -fsS $(PLATFORM_URL)/api/auth/session >/dev/null || { \
	  echo "no platform at $(PLATFORM_URL): run 'make up' in $(PLATFORM_DIR) first" >&2; exit 1; }

e2e: e2e-ready
	PLATFORM_URL=$(PLATFORM_URL) npm run e2e
