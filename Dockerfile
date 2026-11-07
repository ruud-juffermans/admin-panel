# One image: the admin SPA built with Vite, served by the Express server that
# is also the portfolio's backend and the admin API. Listens on :3000.

FROM node:22-alpine AS client
WORKDIR /build
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:22-alpine AS server
# Prisma's engines need OpenSSL on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/static
COPY --from=server /app/node_modules ./node_modules
COPY --from=server /app/package.json ./
COPY --from=server /app/prisma ./prisma
COPY --from=server /app/dist ./dist
COPY --from=client /build/dist ./static
EXPOSE 3000
# Migrate first so a deploy with a new migration never serves against an old
# schema; `migrate deploy` is a no-op when nothing changed.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
