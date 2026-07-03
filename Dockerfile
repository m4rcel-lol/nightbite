FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache dumb-init

FROM base AS development
WORKDIR /app
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

FROM base AS production
WORKDIR /app
COPY --from=development /app/node_modules ./node_modules
COPY src ./src
RUN npm run build

FROM production
COPY --from=production /app/src ./src
COPY --from=production /app/node_modules ./node_modules
COPY prisma ./prisma
COPY data ./data
COPY .env* ./
COPY ./package.json ./

EXPOSE 3000

USER node
ENTRYPOINT ["dumb-init", "node", "src/index.js"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/scripts/healthcheck.js
