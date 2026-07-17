// 본문 이미지 서빙: MinIO에서 읽어 스트림으로 릴레이한다(리다이렉트 아님 → MinIO 주소 은닉).
// 키는 콘텐츠 해시라 불변 → 긴 immutable 캐시. 앞단 Cloudflare 엣지가 대부분 흡수.
import { Readable } from 'node:stream';
import { getImage, contentTypeForKey } from '@/lib/storage';

export const runtime = 'nodejs';

// 우리가 발급하는 키만 허용(<sha256 64hex>.<ext>) → 임의 객체 조회/경로 조작 차단.
const KEY_RE = /^[a-f0-9]{64}\.(png|jpg|gif|webp)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.join('/');
  if (!KEY_RE.test(key)) {
    return new Response('Not found', { status: 404 });
  }

  const stream = await getImage(key);
  if (!stream) {
    return new Response('Not found', { status: 404 });
  }

  const body = Readable.toWeb(stream) as unknown as ReadableStream;
  return new Response(body, {
    headers: {
      'Content-Type': contentTypeForKey(key),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
