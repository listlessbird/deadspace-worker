# Deadspace worker

This is a cloudflare worker that generates data for [deadspace](https://github.com/listlessbird/deadspace-web) using workers ai.

## How to run

1. Install dependencies with `npm install` or use bun `bun install`.
2. Login to wrangler using `npx wrangler login`.
3. Run `npx wrangler secret put DB_URL` to set the database url (or create a .dev.vars file with the DB_URL variable).
4. Generate types using `npm run cf-typegen`.
5. Run `npm run dev` to start the worker.
