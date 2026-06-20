# CoClerk Monorepo

## Overview
This repository contains the foundation for CoClerk, an open-source, self-hosted AI interface for barristers' chambers in England and Wales. It acts as an intelligent layer alongside existing Case Management Systems (CMS).

## Directory Structure
- `apps/api`: Express Backend gateway, workflow logic, and permission engine.
- `apps/worker`: Job queue processor for notifications and sync operations.
- `apps/web-clerk`: React/Vite-based clerk workspace.
- `apps/web-barrister`: PWA-ready React/Vite barrister interface.
- `packages/*`: Shared domain logic, database schemas (Drizzle), UI tokens, and config.

## Local Development Prerequisites

- **Node.js**: v20.11.1 `.nvmrc` (`nvm use`).
- **Package Manager**: `pnpm` v8+.
- **Database**: PostgreSQL 15+.
- **Docker & Docker Compose**: Preferred simple local setup.

## Running Locally (Docker Compose) - The Simple Way

The easiest way to see CoClerk running is using Docker compose, which will set up the database, run migrations, insert seed data, and start all apps.

1. `docker compose up --build`
2. Access the Clerk Desktop at `http://localhost:3000`
3. Access the Barrister Mobile app at `http://localhost:3001`

*Note: Database credentials for local development are configured out-of-the-box. Change them in `.env` and `docker-compose.yml` for any other environment.*

## Running Locally (Manual) - The Fast Developer Way

If you prefer to run Node.js locally for faster iteration:

1. Start just the PostgreSQL database:
   `docker compose up postgres -d`
2. Corepack & Install:
   `corepack enable && pnpm install`
3. Run migrations and seed data:
   `pnpm db:migrate && pnpm db:seed`
4. Start all apps concurrently (API, web-clerk, web-barrister):
   `pnpm dev`

### Mock Boundaries
- **Authentication**: JWT auth against seeded users (no user registration yet).
- **LLM Context**: Deterministic mocking used to test parsing/ranking before hooking to Anthropic/Ollama APIs.

For full architectural documentation, see [ARCHITECTURE.md](ARCHITECTURE.md) and [FEATURE_SPEC.md](FEATURE_SPEC.md).
