# Project Structure

This repository is a pnpm monorepo.

```txt
apps/
  web/       React/Vite dashboard
  server/    Express/tRPC API
  mobile/    Expo app
packages/
  api/       Shared API contract and transformer
docs/
  architecture/
  flows/
  generated/
infra/
  docker/
```

## Web

```txt
apps/web/src/
  app/          Entry point, routing, app providers
  components/   Shared UI components
  config/       Frontend configuration
  contexts/     React contexts/providers
  data/         Static frontend data
  features/     Domain pages and feature-owned components
  hooks/        Shared hooks
  lib/          API clients and shared utilities
  pages/        Generic pages that are not owned by one feature
  styles/       Global styles
```

Put domain-specific screens under `src/features/<domain>/pages`.
Put reusable UI under `src/components`.

## Server

```txt
apps/server/src/
  data/       Local JSON data/cache
  lib/        Cross-domain infrastructure utilities
  modules/    Domain controllers, services, repositories, and helpers
  shared/     Shared schemas/types
  trpc/       tRPC setup
  types/      Type declarations
```

Put new domain API behavior under `src/modules/<domain>` first. Use `src/lib` only for cross-domain infrastructure.

## Infra

Docker Compose and nginx config live under `infra/docker`.
Generated diagrams and PDFs live under `docs/generated`.
