# NewDashboardYomedia

Monorepo cho hệ thống dashboard nội bộ, gồm:
- `apps/web`: giao diện quản trị (Vite + React + TypeScript)
- `apps/server`: API backend (Express + TypeScript)
- `apps/mobile`: ứng dụng mobile (Expo + React Native)

## Tech Stack

- Frontend: React, Vite, TypeScript, React Router
- Backend: Express, TypeScript, SFTP client, JSZip
- Mobile: Expo, React Native, Expo Router
- Workspace: pnpm workspaces

## Project Structure

```bash
NewDashboardYomedia/
├─ apps/
│  ├─ web/
│  ├─ server/
│  └─ mobile/
├─ packages/
├─ pnpm-workspace.yaml
└─ README.md
```

## Requirements

- Node.js 18+ (khuyen nghi Node.js 20+)
- pnpm 10+

## Install

```bash
pnpm install
```

## Run Development

### Web

```bash
pnpm --filter web dev
```

Mac dinh chay tai: `http://localhost:3000`

### Server

```bash
pnpm --filter server dev
```

### Mobile

```bash
pnpm --filter mobile start
```

## Build

### Web

```bash
pnpm --filter web build
```

### Server

```bash
pnpm --filter server build
```

## Lint / Type Check

```bash
pnpm --filter web lint
pnpm --filter server lint
pnpm --filter mobile lint
```

## Environment Variables

Moi app co file environment rieng:
- `apps/web/.env`
- `apps/server/.env.local` (hoac `.env`)

Hay tao cac bien moi truong can thiet truoc khi chay local.

## Notes

- Repo dang su dung `pnpm` voi `nodeLinker: hoisted`.
- Khong commit file nhay cam nhu `.env`, credentials, key.

## License

Noi bo / theo chinh sach du an.
