# quizas 배포 가이드 — 홈서버 VM

> **권장 구성 (TL;DR)**
> - **실행**: Docker Compose 풀스택 (`web` + `api` + `postgres` 한 묶음)
> - **외부 노출**: **Cloudflare Tunnel** — 공유기 포트포워딩 없이, 홈 IP를 숨긴 채 HTTPS 제공
> - **DB 마이그레이션**: 컨테이너 기동 시 `prisma migrate deploy` 자동 실행
> - **업데이트**: `git pull && docker compose ... up -d --build`
>
> 자바 비유: Docker Compose는 여러 `Spring Boot` 서비스 + DB를 하나의 `docker-compose`로 묶어 `java -jar` 대신 컨테이너로 띄우는 것과 같습니다. Cloudflare Tunnel은 사내망 서비스를 리버스 프록시로 외부에 안전하게 노출하는 것과 비슷합니다(인바운드 포트를 열지 않음).

---

## ⚑ 현행 배포 (homelab k3s) — 이게 실제 운영 방식

이 문서의 아래 Compose 가이드는 **단독 VM**용 *원본* 방식입니다. **현재 quizas는 별도 홈랩 k3s 클러스터에 배포**되어 운영 중입니다:

- **실행**: k3s `apps` 네임스페이스의 `quizas-web`(공개) + `quizas-api`(내부) Deployment. 매니페스트는 `homelab/k8s/apps/quizas.yaml`.
- **DB**: 클러스터 밖 Postgres LXC(`postgres.data.svc.cluster.local`)의 `quizas` DB. 부팅 시 `prisma migrate deploy` 자동.
- **외부 노출**: 공유 Cloudflare Tunnel(gateway) → Traefik → `https://quizas.jwih.org`.
- **인증**: 비밀번호(`ADMIN_PASSWORD`) 폐지 → **Authentik OIDC(SSO)**. `web`은 OIDC 세션으로 `/admin` 보호, `web→api`는 내부 공유 `ADMIN_TOKEN` 유지.
- **이미지 빌드/배포·접근·운영**: → **`homelab/OPERATIONS.md`** 참고 (레지스트리 없이 노드 빌드→`k3s ctr import`→rollout).
- 코드의 인증 전환은 `feat/authentik-oidc` 브랜치.

> 아래 Compose 방식도 여전히 유효한 대안(단독 VM/오프-클러스터)입니다. 단 **`ADMIN_PASSWORD`는 현행 코드에서 제거**되었으니, Compose로 갈 경우 web에 Authentik OIDC 환경변수(`AUTH_*`)를 대신 주입해야 합니다.

---

## 0. 아키텍처 한눈에 보기 (원본: 단독 VM + Compose)

```
                 인터넷
                   │  https://blog.example.com
                   ▼
        ┌──────────────────────┐
        │   Cloudflare (Edge)  │  ← TLS 종료, 홈 IP 숨김
        └──────────┬───────────┘
                   │ 아웃바운드 터널 (포트 개방 X)
                   ▼
┌─────────────────────────────────────────────┐
│  홈서버 VM (Ubuntu/Debian)  — Docker Compose  │
│                                               │
│   cloudflared ──▶ web (Next.js :3000)         │
│                      │ API_URL=http://api:4000 │
│                      ▼                         │
│                   api (NestJS :4000)           │
│                      │ DATABASE_URL            │
│                      ▼                         │
│                   postgres :5432 (내부 전용)    │
│                      │                          │
│                   [pgdata 볼륨]                 │
└─────────────────────────────────────────────┘
```

- 외부에서 직접 닿는 건 `web`뿐. `api`·`postgres`는 컴포즈 내부 네트워크에만 노출됩니다.
- `postgres`는 호스트 포트를 **공개하지 않습니다**(로컬 개발용 `compose.yaml`과 다른 점).

---

## 1. 사전 준비물

| 항목 | 권장 | 비고 |
|---|---|---|
| VM OS | Ubuntu 24.04 LTS (또는 Debian 12) | Proxmox/VirtualBox 등 무엇이든 OK |
| vCPU / RAM | 2 vCPU / 최소 2GB (4GB 권장) | Next 빌드 시 메모리 사용 |
| 디스크 | 20GB+ | 이미지 + DB + 백업 |
| 도메인 | 1개 (예: `example.com`) | Cloudflare에 네임서버 위임 필요 |
| 계정 | Cloudflare 무료 플랜 | Tunnel 사용 |

> 도메인이 없다면: Cloudflare에서 도메인을 구매하거나, 보유 도메인의 네임서버를 Cloudflare로 옮기면 됩니다(무료). Tunnel은 Cloudflare가 DNS를 관리해야 동작합니다.

---

## 2. VM 기본 세팅

VM에 SSH로 접속한 뒤(아래 명령은 VM 안에서 실행):

```bash
# 2-1. 패키지 최신화
sudo apt update && sudo apt upgrade -y

# 2-2. 작업용 비루트 사용자 (이미 있으면 생략)
sudo adduser deploy
sudo usermod -aG sudo deploy
# 이후 deploy 사용자로 작업

# 2-3. 방화벽: SSH만 허용 (Tunnel은 아웃바운드라 인바운드 개방 불필요)
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

> **포인트**: Cloudflare Tunnel을 쓰면 80/443을 **열 필요가 없습니다**. 공유기 포트포워딩도 안 합니다. 인바운드는 SSH만 열려 있으면 됩니다.

### Docker 설치

```bash
# 공식 편의 스크립트
curl -fsSL https://get.docker.com | sudo sh

# deploy 사용자가 sudo 없이 docker 쓰도록
sudo usermod -aG docker deploy
newgrp docker   # 또는 재로그인

docker --version
docker compose version
```

---

## 3. 소스 가져오기

```bash
cd ~
git clone <YOUR_REPO_URL> quizas
cd quizas
```

> Git 호스팅이 없다면 로컬에서 `rsync`/`scp`로 올려도 됩니다. 다만 업데이트 편의상 Git 권장.

---

## 4. 프로젝트에 추가할 파일

아래 5개 파일을 **새로 만듭니다**. (로컬에서 만들어 커밋한 뒤 VM에서 `git pull` 해도 되고, VM에서 직접 만들어도 됩니다. `.env.production`만은 절대 커밋하지 마세요.)

### 4-1. `.dockerignore` (프로젝트 루트)

호스트의 `node_modules`/`.next`/시크릿이 이미지에 섞여 들어가는 걸 막습니다. (자바로 치면 `.dockerignore`는 빌드 컨텍스트에서 `target/`·`*.env`를 빼는 것)

```gitignore
**/node_modules
**/.next
**/dist
**/.turbo
**/.env
**/.env.*
.git
.gitignore
```

### 4-2. `apps/api/Dockerfile`

```dockerfile
# NestJS API. Prisma는 OpenSSL이 필요해 slim 이미지에 설치한다.
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# 호스트에서 mise로 핀했던 pnpm 버전과 동일하게 맞춘다.
RUN npm install -g pnpm@11.8.0

WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quizas/api exec prisma generate
RUN pnpm --filter @quizas/api build

WORKDIR /repo/apps/api
ENV PORT=4000
EXPOSE 4000

# 기동 시 마이그레이션을 먼저 적용한 뒤 서버를 띄운다(멱등).
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
```

### 4-3. `apps/web/Dockerfile`

```dockerfile
# Next.js 16 프런트(SSR). next build 후 next start로 구동.
FROM node:22-slim

RUN npm install -g pnpm@11.8.0

WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @quizas/web build

WORKDIR /repo/apps/web
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "start"]
```

> 참고: 우리 페이지는 모두 `cache: 'no-store'`라 **빌드 시 API를 호출하지 않습니다**(전부 동적 렌더링). 따라서 `next build` 단계에서 `api`가 떠 있지 않아도 됩니다.

### 4-4. `compose.prod.yaml` (프로젝트 루트)

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    # 호스트 포트는 공개하지 않는다 — 내부 네트워크 전용

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
      ADMIN_TOKEN: ${ADMIN_TOKEN}
      PORT: "4000"
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    environment:
      API_URL: "http://api:4000"
      ADMIN_TOKEN: ${ADMIN_TOKEN}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      PORT: "3000"
    depends_on:
      - api

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - web

volumes:
  pgdata:
```

### 4-5. `.env.production` (프로젝트 루트, **gitignore 필수**)

```bash
# DB
POSTGRES_USER=inho
POSTGRES_PASSWORD=__강력한_비밀번호로_교체__
POSTGRES_DB=quizas

# 관리자 인증 — api의 ADMIN_TOKEN과 web의 ADMIN_TOKEN은 반드시 동일해야 함
ADMIN_TOKEN=__openssl로_생성__
ADMIN_PASSWORD=__로그인_비밀번호__

# Cloudflare Tunnel 토큰 (7단계에서 발급)
CLOUDFLARE_TUNNEL_TOKEN=__대시보드에서_복사__
```

`.gitignore`에 한 줄 추가:

```bash
echo ".env.production" >> .gitignore
```

---

## 5. 시크릿 생성

```bash
# ADMIN_TOKEN (api↔web 공유 비밀)
openssl rand -hex 32

# POSTGRES_PASSWORD, ADMIN_PASSWORD 도 충분히 길게
openssl rand -base64 24
```

생성한 값을 `.env.production`에 채웁니다.

> ⚠️ 로컬 개발에서 쓰던 `ADMIN_TOKEN`·`ADMIN_PASSWORD`는 **재사용 금지**. 커밋·로그·이 대화에 노출됐으니 운영용은 새로 발급하세요.
> ⚠️ `web`의 `ADMIN_TOKEN`과 `api`의 `ADMIN_TOKEN`이 **다르면** 글쓰기·모더레이션이 401로 실패합니다. 같은 값이어야 합니다.

---

## 6. 빌드 & 기동

`cloudflared`는 7단계에서 토큰을 받은 뒤 띄울 것이므로, 먼저 앱부터 올립니다.

```bash
cd ~/quizas

# web + api + postgres 빌드 & 기동 (cloudflared 제외)
docker compose -f compose.prod.yaml --env-file .env.production up -d --build postgres api web

# 상태 확인
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f api   # 마이그레이션 로그 확인 (Ctrl+C로 빠져나옴)
```

기동되면 VM 내부에서 동작 확인:

```bash
curl -s localhost:3000 | head        # web (호스트에 포트 공개 안 했다면 아래 방법 사용)
docker compose -f compose.prod.yaml exec web wget -qO- localhost:3000 | head
docker compose -f compose.prod.yaml exec api wget -qO- localhost:4000/posts | head
```

### (선택) 초기 시드 데이터

비어 있는 DB에 예시 카테고리/태그/첫 글을 넣고 싶다면 한 번만:

```bash
docker compose -f compose.prod.yaml exec api pnpm db:seed
```

> 마이그레이션(`prisma migrate deploy`)은 `api` 컨테이너가 **뜰 때마다 자동**으로 적용되므로 별도 실행이 필요 없습니다. 시드는 멱등이지만 운영에선 보통 한 번만.

---

## 7. 인터넷에 노출 — Cloudflare Tunnel (권장)

1. Cloudflare 대시보드 → **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** → *Cloudflared* 선택.
2. 터널 이름(예: `quizas`) 입력 후 생성. → **토큰**이 표시됩니다(`eyJ...` 형태). 이 값을 `.env.production`의 `CLOUDFLARE_TUNNEL_TOKEN`에 붙여넣습니다.
3. **Public Hostname** 탭에서 라우트 추가:
   - Subdomain/Domain: `blog.example.com` (원하는 호스트)
   - Service: **HTTP** → `web:3000`
     (터널이 컴포즈 네트워크 안에서 `web` 컨테이너로 프록시)
4. `cloudflared` 컨테이너 기동:

```bash
docker compose -f compose.prod.yaml --env-file .env.production up -d cloudflared
docker compose -f compose.prod.yaml logs -f cloudflared   # "Registered tunnel connection" 확인
```

5. 브라우저에서 `https://blog.example.com` 접속 → 끝. TLS 인증서는 Cloudflare가 자동 처리합니다.

> 관리자 화면은 `https://blog.example.com/admin/login`. (필요하면 Cloudflare Zero Trust **Access** 정책으로 `/admin/*`에 추가 인증을 걸 수도 있습니다 — 권장.)

<details>
<summary><b>대안: 포트포워딩 + DDNS + Caddy</b> (Cloudflare를 쓰지 않을 때)</summary>

1. 공유기에서 80/443 → VM 내부 IP로 포트포워딩.
2. 홈 IP가 유동이면 DDNS(예: `duckdns.org`) 설정, 도메인 A레코드를 DDNS로.
3. `compose.prod.yaml`에서 `cloudflared` 블록을 빼고 아래 `caddy` 추가:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
# volumes: 에 caddy_data, caddy_config 추가
```

4. 루트에 `Caddyfile`:

```
blog.example.com {
    reverse_proxy web:3000
}
```

5. `sudo ufw allow 80,443/tcp`. Caddy가 Let's Encrypt로 TLS 자동 발급.

> 단점: 홈 IP가 노출되고, 공유기 설정·DDNS 관리가 필요하며, 80/443을 외부에 엽니다. 그래서 홈서버에는 Tunnel을 더 권장합니다.
</details>

---

## 8. 운영 (Day 2)

### 코드 업데이트 / 재배포

```bash
cd ~/quizas
git pull
docker compose -f compose.prod.yaml --env-file .env.production up -d --build api web
```

- 스키마 변경(새 Prisma 마이그레이션 포함)이 있어도 `api` 컨테이너가 뜨며 `migrate deploy`로 자동 반영됩니다.
- 무중단까진 아니지만, 재빌드 후 컨테이너 교체라 다운타임은 수 초 수준입니다.

### DB 마이그레이션 워크플로

- **새 마이그레이션 생성은 로컬에서**: 스키마(`schema.prisma`) 수정 → `pnpm --filter @quizas/api exec prisma migrate dev --name <설명>` → 생성된 `prisma/migrations/*`를 **커밋**.
- 운영 VM은 `git pull` 후 재배포만 하면 `migrate deploy`가 새 마이그레이션을 적용합니다. (운영에서 `migrate dev`를 직접 돌리지 마세요.)

### 백업 (중요)

DB 덤프를 정기적으로:

```bash
# 수동 백업
docker compose -f compose.prod.yaml exec -T postgres \
  pg_dump -U inho quizas | gzip > ~/backups/quizas-$(date +%F).sql.gz
```

cron 등록 (매일 새벽 4시):

```bash
mkdir -p ~/backups
crontab -e
# 아래 한 줄 추가
0 4 * * * cd ~/quizas && docker compose -f compose.prod.yaml exec -T postgres pg_dump -U inho quizas | gzip > ~/backups/quizas-$(date +\%F).sql.gz
```

복구:

```bash
gunzip -c ~/backups/quizas-2026-06-21.sql.gz | \
  docker compose -f compose.prod.yaml exec -T postgres psql -U inho -d quizas
```

> `pgdata`는 도커 named 볼륨이라 컨테이너를 지워도 유지됩니다. 단, 디스크 고장에는 위 덤프 백업이 유일한 방어선입니다(가능하면 NAS/클라우드로 복사).

### 로그 / 상태

```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f web
docker compose -f compose.prod.yaml logs --tail=100 api
docker stats   # 리소스 사용량
```

### 중지 / 시작

```bash
docker compose -f compose.prod.yaml stop          # 정지(데이터 유지)
docker compose -f compose.prod.yaml --env-file .env.production up -d   # 재시작
docker compose -f compose.prod.yaml down          # 컨테이너 제거(볼륨은 유지)
# 'down -v'는 볼륨까지 삭제 — DB 날아감, 쓰지 말 것
```

---

## 9. 보안 체크리스트 (홈서버라 특히 중요)

- [ ] `.env.production`은 **절대 커밋 금지** (`.gitignore` 확인)
- [ ] `ADMIN_TOKEN` / `ADMIN_PASSWORD` / `POSTGRES_PASSWORD` 모두 운영용으로 **새로 생성** (로컬 값 재사용 금지)
- [ ] `ufw`로 인바운드는 SSH만 (Tunnel 사용 시 80/443 열지 않음)
- [ ] SSH 키 로그인만 허용, 비밀번호 로그인 비활성 (`/etc/ssh/sshd_config`: `PasswordAuthentication no`)
- [ ] `postgres`는 호스트 포트 미공개 (compose.prod.yaml에 `ports:` 없음 — 확인)
- [ ] (권장) Cloudflare Zero Trust **Access**로 `/admin/*` 경로에 2차 인증
- [ ] OS 자동 보안 업데이트: `sudo apt install unattended-upgrades`
- [ ] 정기 백업 cron 동작 확인

---

## 10. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| 글쓰기·댓글 승인이 401 | `web`과 `api`의 `ADMIN_TOKEN`이 다름. `.env.production` 한 값으로 통일 후 `up -d`. |
| `api`가 DB 연결 실패로 재시작 반복 | `DATABASE_URL` 호스트명이 `localhost`가 아니라 **`postgres`**(서비스명)인지 확인. `postgres` healthcheck 통과 여부 `ps`로 확인. |
| 한글 제목 글/시리즈가 404 | (이미 코드에서 처리됨) 동적 라우트 param 디코딩 이슈. 최신 코드 반영됐는지 `git pull` 확인. |
| `next build`가 메모리로 죽음(OOM) | VM RAM 부족. 4GB로 늘리거나 swap 추가: `sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`. |
| Prisma 엔진 에러(`libssl`) | `api/Dockerfile`에 `openssl` 설치 라인 있는지 확인(있음). |
| 터널은 붙었는데 502 | `web` 컨테이너가 떠 있는지, Tunnel Service가 `http://web:3000`인지 확인. |
| 변경이 반영 안 됨 | `--build` 빼먹음. `up -d --build api web`로 재빌드. |

---

## 부록: Docker 없이 운영하기 (systemd)

도커를 피하고 싶다면, 호스트에 mise로 Node/pnpm를 깔고 `pnpm build` 후 `systemd` 유닛 2개(`api`=`node dist/main`, `web`=`pnpm --filter @quizas/web start`)로 돌리고, `postgres`만 도커로 두는 방법도 있습니다. 재현성·격리는 도커 풀스택이 더 좋아 권장하진 않지만, 필요하면 별도로 안내해 드리겠습니다.

---

*문서 기준 스택: pnpm 11.8.0 / Node 22 / Next.js 16 / NestJS 11 / Prisma 6.19.3 / PostgreSQL 17*
