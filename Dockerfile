FROM node:20-slim AS native-deps
WORKDIR /build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && npm rebuild better-sqlite3


FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080

COPY public ./public
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY scripts/init-db.mjs ./scripts/init-db.mjs
COPY scripts/apply-patches.mjs ./scripts/apply-patches.mjs

# Overwrite Mac-compiled binary with linux-compiled one
COPY --from=native-deps /build/node_modules/better-sqlite3 ./node_modules/better-sqlite3

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# seed.db is injected by deploy.sh from the live backup; empty file = fresh init
COPY seed.db /app/seed.db

RUN mkdir -p /data
ENV DATABASE_URL=file:/data/claw.db

VOLUME ["/data"]

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["./entrypoint.sh"]
