# syntax=docker/dockerfile:1
# quizas api (NestJS + Prisma, pnpm monorepo).
# 빌드 컨텍스트 = 레포 루트:  docker build -f apps/api/Dockerfile -t quizas-api:TAG .
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quizas/api exec prisma generate
RUN pnpm --filter @quizas/api build

FROM base AS runner
ENV NODE_ENV=production PORT=4000
# 전체 레포 복사 (생성된 Prisma client + prisma CLI(migrate용) 포함). 홈랩이라 이미지 크기 허용.
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
# 부팅 시 마이그레이션 적용 후 서버 기동
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
