# Deadspace worker

This is a cloudflare worker that generates data for [deadspace](https://github.com/listlessbird/deadspace-web) using workers ai.

## How to run

1. Install wrangler
2. Login to wrangler
3. Run `wrangler secret put DB_URL` to set the database url (or create a .dev.vars file with the DB_URL variable)
4. Run `wrangler dev` to start the worker
