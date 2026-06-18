# Mobile Agent Guidelines

These rules apply to `apps/mobile`.

## Required References

- Read root `AGENTS.md` first.
- Use `apps/mobile/README.md` only as Expo project reference when needed.
- Read `apps/api/AGENTS.md` when mobile work depends on backend API contracts or auth behavior.

## Structure

- `app`: Expo Router file-based routes.
- `components`: reusable React Native components.
- `components/ui`: low-level UI primitives.
- `constants`: shared constants such as theme values.
- `hooks`: reusable mobile hooks.
- `assets`: images and static app assets.
- `scripts`: local project scripts such as reset tooling.

## Commands

- `pnpm --filter mobile start`
- `pnpm --filter mobile android`
- `pnpm --filter mobile ios`
- `pnpm --filter mobile web`
- `pnpm --filter mobile lint`
- `pnpm --filter mobile reset-project`

## Rules

- Follow Expo Router conventions for routes and layouts.
- Keep platform-specific code isolated with platform files when needed, such as `.ios.tsx` or `.web.ts`.
- Keep reusable UI in `components` and app screens in `app`.
- Do not add backend secrets or direct database, AI provider, RAG, MCP, or SQL access to mobile code.
- Validate UX input locally when helpful, but rely on backend validation and authorization for security.
