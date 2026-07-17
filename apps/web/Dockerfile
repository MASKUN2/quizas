# syntax=docker/dockerfile:1
# quizas web (Next.js standalone, pnpm monorepo).
# 빌드 컨텍스트 = 레포 루트:  docker build -f apps/web/Dockerfile -t quizas-web:TAG .
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @quizas/web build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs
# monorepo standalone 레이아웃: server.js 는 apps/web/server.js, node_modules 는 루트
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
