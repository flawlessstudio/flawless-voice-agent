.PHONY: dev build start test lint format typecheck clean docker-up docker-down eval help

## Default target
help:
	@echo ""
	@echo "Flawless Voice Agent — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

dev: ## Start development server with hot reload
	npm run dev

build: ## Compile TypeScript to dist/
	npm run build

start: ## Start production server
	npm run start

test: ## Run full test suite
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

lint: ## Run ESLint
	npm run lint

lint-fix: ## Auto-fix lint issues
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

typecheck: ## Run TypeScript type checking
	npm run typecheck

eval-smoke: ## Run smoke eval suite (< 60s)
	npm run eval:smoke

eval-regression: ## Run regression eval suite
	npm run eval:regression

compliance: ## Run compliance checks
	npm run compliance:check

audit: ## Run npm security audit
	npm audit --audit-level=high

clean: ## Remove dist/, coverage/, .cache
	npm run clean

docker-up: ## Start all local services via docker-compose
	docker compose up -d

docker-down: ## Stop all local services
	docker compose down

docker-build: ## Build production Docker image
	docker build -t flawless-voice-agent:local .

logs: ## Tail application logs from docker
	docker compose logs -f app

seed: ## Run development seed scripts
	node scripts/seed.js
