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

# Run as the built-in non-root user.
USER node

EXPOSE 5000
CMD ["node", "dist/index.js"]
