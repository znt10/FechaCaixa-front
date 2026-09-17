# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base: Node com as dependencias de sistema minimas.
# Next 16 exige Node >= 20.9; usamos 22 LTS.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps: instala node_modules a partir do lockfile (cache de layer).
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# dev: usado pelo docker-compose. O codigo vem por bind mount,
# entao aqui so ficam os node_modules instalados na imagem.
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# ---------------------------------------------------------------------------
# builder: build de producao.
# ---------------------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
# O commit vira a versao deste build (ver next.config.ts), e e o que o aparelho
# compara para saber que ficou para tras. Opcional: sem ele o build usa a
# propria hora, que muda a cada deploy do mesmo jeito — o commit so torna o
# valor legivel para quem for investigar.
ARG RAILWAY_GIT_COMMIT_SHA
ENV RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod: roda o servidor Next ja compilado.
# ---------------------------------------------------------------------------
# Ultimo estagio de proposito: e o alvo que um build sem --target escolhe, e e
# assim que o Railway constroi.
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json next.config.ts ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
