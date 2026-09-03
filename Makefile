# MQE Portfolio monorepo

SHELL := /bin/bash
# Local Go toolchain (not system-installed)
GO ?= $(HOME)/.local/go/bin/go
GOBIN ?= $(HOME)/go/bin
export PATH := $(GOBIN):$(shell dirname $(GO)):$(PATH)

.PHONY: help dev dev-stop build test lint up down db-up db-down logs api api-gen api-swag api-run api-migrate deploy cf-preview

help: ## Show available commands
	@echo "MQE Portfolio commands:"
	@echo "  make dev        Run the site (Astro) in dev mode"
	@echo "  make dev-stop   Stop a running Astro dev server"
	@echo "  make build      Build the site for production"
	@echo "  make deploy     Build + deploy the site to Cloudflare Workers"
	@echo "  make cf-preview Preview the Cloudflare build locally (wrangler dev)"
	@echo "  make up         Start dev containers (Postgres + Caddy) with Podman/Docker"
	@echo "  make down       Stop dev containers"
	@echo "  make db-up      Start Postgres container only"
	@echo "  make logs       Tail container logs"
	@echo "  make test       Run all tests"
	@echo "  make lint       Lint all code"
	@echo "  make api        Generate Go code (sqlc) + docs (swag)"
	@echo "  make api-run    Run the Go API (requires Go installed)"
	@echo "  make api-migrate Apply DB migrations (golang-migrate)"

dev: ## Run the site in dev mode (replaces any running dev server)
	cd apps/site && bun run dev --force

dev-stop: ## Stop a running Astro dev server
	cd apps/site && bunx astro dev stop

build:
	cd apps/site && bun run build

deploy: ## Build + deploy the site to Cloudflare Workers
	cd apps/site && bun run deploy

cf-preview: ## Preview the Cloudflare build locally
	cd apps/site && bun run cf:preview

test:
	cd apps/site && bun run test

lint:
	cd apps/site && bun run lint

up:
	podman compose -f deploy/docker-compose.yml up -d

down:
	podman compose -f deploy/docker-compose.yml down

db-up:
	podman compose -f deploy/docker-compose.yml up -d postgres

logs:
	podman compose -f deploy/docker-compose.yml logs -f

# --- Go API (local toolchain in ~/.local/go + ~/go/bin) ---
api: api-gen api-swag

api-gen:
	cd services/api && sqlc generate

api-swag:
	cd services/api && swag init -g cmd/api/main.go -o docs

api-run:
	cd services/api && go run ./cmd/api

api-migrate:
	cd services/api && migrate -path migrations -database "$${DATABASE_URL:-postgres://mqe:mqe_dev_password@localhost:5432/mqe?sslmode=disable}" up