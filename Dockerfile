# ─── Stage 1: Build the React frontend ──────────────────────────────────────
# Produces client/dist — the static files Express will serve in production.
FROM node:22-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
# --legacy-peer-deps: the client's eslint v9 and @eslint/js v10 devDependencies
# have a peer-dependency conflict that npm's default resolver rejects. It only
# affects linting (not the production build), so relaxing the check here is safe.
RUN npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

# ─── Stage 2: Production server ─────────────────────────────────────────────
# Node 22 is required — the backend uses the built-in `node:sqlite` module.
FROM node:22-slim AS runner

# bcrypt compiles a native binding during npm install; these tools are the
# fallback if no prebuilt binary matches this platform/Node ABI.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Keep the same relative layout as the source repo (server/ next to client/)
# so the app's existing `path.join(__dirname, '../../client/dist')` just works.
WORKDIR /app/server

COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./

# Drop the built frontend exactly where app.js expects to find it.
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/app.js"]
