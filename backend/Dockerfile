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

# Only production dependencies in the final image.
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Images now go straight to Cloudinary (services/imageStorage.ts) instead of
# this container's own disk, so there's no volume to chown and no reason to
# start as root any more — the process runs as the unprivileged `node` user
# from the start.
USER node
CMD ["node", "dist/index.js"]
