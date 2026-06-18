# Mobile App

Expo mobile app for NewDashboardYomedia.

## Commands

Run from the repository root:

```bash
pnpm install
pnpm --filter mobile start
pnpm --filter mobile android
pnpm --filter mobile ios
pnpm --filter mobile web
pnpm --filter mobile lint
pnpm --filter mobile reset-project
```

## Notes

- Follow `apps/mobile/AGENTS.md` before changing mobile code.
- App routes live in `app/`.
- Reusable React Native components live in `components/`.
- Static images and app assets live in `assets/`.
