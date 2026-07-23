# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# su-exec lets the entrypoint start as root (to chown a mounted volume) and
# then drop to the unprivileged `node` user for the actual process.
RUN apk add --no-cache su-exec

# Only production dependencies in the final image.
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Fallback upload directory for when NO volume is mounted (local `docker run`,
# docker-compose). On Railway with a volume, env.uploadDir points at the
# volume instead and this stays empty. Owned by `node` so writes succeed.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5000

# NOTE: no `USER node` here on purpose — the entrypoint must start as root to
# fix volume ownership, then it drops to `node` via su-exec. The Node process
# itself never runs as root.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
