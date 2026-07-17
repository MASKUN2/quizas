import { auth } from '@/auth';

/**
 * True when a valid Authentik OIDC session exists.
 * 단일 작성자 블로그라 "로그인됨 = 관리자". API 호출용 토큰은 서버 환경변수
 * ADMIN_TOKEN(클러스터 내부 전용)을 쓴다 — adminToken() 참고.
 */
export async function isAuthed(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}
