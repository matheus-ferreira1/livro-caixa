# syntax=docker/dockerfile:1

FROM oven/bun:1.3 AS manifests
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/domain/package.json packages/domain/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Not part of the image, but bun install --frozen-lockfile needs every workspace in bun.lock.
COPY apps/site/package.json apps/site/

FROM manifests AS build
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
RUN bun run --filter '@livro-caixa/web' build

FROM manifests AS prod-deps
RUN bun install --frozen-lockfile --production --filter '@livro-caixa/api'

FROM oven/bun:1.3-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/livro-caixa.sqlite \
    STATIC_DIR=/app/apps/web/dist
COPY --from=prod-deps /app ./
COPY packages/domain/src packages/domain/src
COPY apps/api/src apps/api/src
COPY --from=build /app/apps/web/dist apps/web/dist
RUN mkdir -p /data && chown bun:bun /data
USER bun
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD bun -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
WORKDIR /app/apps/api
CMD ["bun", "src/server.ts"]
