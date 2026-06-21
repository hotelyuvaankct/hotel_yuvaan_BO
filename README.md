# Hotel Yuvaan Backoffice

Vite + React + TypeScript admin shell with Tailwind, warm gold/bronze tokens, and class-based dark mode.

## Vercel Deploy

This repo is ready for Vercel deployment with [vercel.json](vercel.json). The app builds to `dist`, and all client-side routes are rewritten to `index.html` so React Router works on refresh and direct links.

**Default deployment uses the dev API** (`.env.dev`) via `pnpm build`. For production API builds, set the Vercel build command to `pnpm build:prod`.

## Scripts

| Environment | Env file     | Dev server         | Build               |
|-------------|--------------|--------------------|---------------------|
| Dev (remote)| `.env.dev`   | `pnpm dev`         | `pnpm build` (default) |
| Local       | `.env.localhost` | `pnpm dev:local`   | `pnpm build:local`  |
| Production  | `.env.prod`  | `pnpm dev:prod`    | `pnpm build:prod`   |

- `pnpm preview` / `pnpm preview:dev` / `pnpm preview:local` / `pnpm preview:prod`
- `pnpm typecheck`
# hotel_yuvaan_BO
 
