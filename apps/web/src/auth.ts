import NextAuth from 'next-auth';
import Authentik from 'next-auth/providers/authentik';

/**
 * Auth.js (NextAuth v5) — Authentik OIDC.
 *
 * 환경변수 자동 로딩: AUTH_AUTHENTIK_ID, AUTH_AUTHENTIK_SECRET, AUTH_AUTHENTIK_ISSUER,
 * AUTH_SECRET, AUTH_URL. CF Tunnel + Traefik 뒤라 trustHost + forwarded-https 미들웨어 필요.
 *
 * 단일 작성자 블로그: Authentik 로그인 성공 = 관리자(akadmin). 사용자 테이블 없음.
 * (다중 사용자가 되면 여기서 groups/email로 admin 판정 추가)
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [Authentik],
});
