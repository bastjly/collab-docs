db: node scripts/start-db.mjs
api: node scripts/wait-for-db.mjs && npm run dev -w @collab-docs/api
ws: node scripts/wait-for-db.mjs && npm run dev -w @collab-docs/ws
client: npm run dev -w @collab-docs/client
